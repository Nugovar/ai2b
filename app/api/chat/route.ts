// Server-side chat endpoint. The OpenAI key lives ONLY here (server env).
// Receives the full message history + active language, calls gpt-4o-mini with
// the system prompt, parses the control JSON out of the reply, and returns
// { reply, control }.
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { parseControl, normalizeControl } from "@/lib/parseControl";
import { getDict, type Lang } from "@/lib/i18n";
import { MARKETING_ONLY } from "@/lib/config";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { ChatApiResponse, ChatControl, ChatMessage } from "@/lib/types";
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

export const runtime = "nodejs";

// Give the function enough headroom for a slow model response + retries, so
// Vercel doesn't kill it mid-flight (the default is only 10s, which a slow
// response or a 429 retry can exceed -> surfaced as "connection failed").
// Hobby supports up to 60s via this export; Pro up to 300s.
export const maxDuration = 60;

// Language instruction appended to the system prompt so replies + chips match
// the user's selected language.
const LANG_INSTRUCTION: Record<Lang, string> = {
  ka: "\n\nIMPORTANT: Respond ONLY in Georgian (ქართულად). The chips array must also be in Georgian.",
  en: "\n\nIMPORTANT: Respond ONLY in English. The chips array must also be in English.",
};

// TEMPORARY marketing-only scope (toggled by MARKETING_ONLY in lib/config.ts).
// Soft restriction: focus on marketing; politely defer other needs as "coming
// soon" and steer back to marketing. Other categories' logic stays intact.
const MARKETING_SCOPE =
  "\n\n## ფოკუსი: მხოლოდ მარკეტინგი (ამჟამად)\n" +
  "ამ ეტაპზე AI2Business ფოკუსირებულია მხოლოდ მარკეტინგზე. დაეხმარე მხოლოდ მარკეტინგულ თემებში: " +
  "სოციალური ქსელების მართვა, რეკლამა (Meta/Google), კონტენტი/რეელსები, მარკეტინგ-სტრატეგია, ბრენდინგი/პოზიციონირება, სარეკლამო კამპანიები. " +
  "თუ მომხმარებელი ითხოვს არა-მარკეტინგულ საჭიროებას (იურიდიული, დეველოპმენტი/ვებსაიტი, წმინდა დიზაინი მარკეტინგთან კავშირის გარეშე, ბიზნეს-კონსალტინგი), " +
  "თბილად და მოკლედ უთხარი, რომ AI2Business ამჟამად მარკეტინგზეა ფოკუსირებული და ის მიმართულებები მალე დაემატება, შემდეგ კი დააბრუნე საუბარი იმაზე, " +
  "თუ როგორ შეგიძლია დაეხმარო მარკეტინგში. category ასეთ შემთხვევებში დააყენე \"მარკეტინგი\". " +
  "შეინარჩუნე იგივე ლოგიკა: ჭკვიანი რელევანტური კითხვები -> მორგებული რჩევა -> ექსპერტის შეთავაზება -> ლიდის აღება.";

const DEFAULT_CONTROL: ChatControl = {
  phase: "discovery",
  slots: {},
  showLeadForm: false,
  chips: [],
};

// Input bounds — reject/trim abusive payloads before they reach the model.
const MAX_MESSAGES = 40; // only the most recent are sent
const MAX_CONTENT_CHARS = 8000; // per message
const MAX_ATTACHMENTS_PER_MSG = 4;
const MAX_FETCH_BYTES = 25 * 1024 * 1024; // server-side attachment fetch cap
const FETCH_TIMEOUT_MS = 10_000;

// SSRF guard: the server may only fetch attachment bytes from a `data:` URL
// (our no-Supabase fallback) or our OWN Supabase Storage host. Any other URL in
// the request body (attacker-controlled) is refused, so /api/chat can't be used
// to probe internal/arbitrary hosts.
function attachmentUrlAllowed(url: string): boolean {
  if (url.startsWith("data:")) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return false;
    return u.host === new URL(base).host;
  } catch {
    return false;
  }
}

// Fetch a remote file and return it as a base64 data URL. Data URLs (the no-
// Supabase fallback) are returned as-is, since Node's fetch can't open them.
// Bounded by a timeout + size cap. Callers must pre-check attachmentUrlAllowed.
async function toDataUrl(url: string, type: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared && declared > MAX_FETCH_BYTES) throw new Error("file too large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_FETCH_BYTES) throw new Error("file too large");
    return `data:${type};base64,${buf.toString("base64")}`;
  } finally {
    clearTimeout(timer);
  }
}

// Convert one stored chat message into the OpenAI message shape. User messages
// with attachments become MULTIMODAL:
//   - images  -> image_url parts (the model SEES them; gpt-4o-mini has vision).
//   - PDFs     -> a `file` part with the file bytes (the model READS them), but
//                 ONLY for the most recent user message to bound latency/cost;
//                 older PDFs collapse to a "[file: name]" note.
// Images stay as URLs (cheap) across all turns; PDF bytes are fetched server-
// side, so the inbound /api/chat body never carries file bytes.
async function toOpenAIMessage(m: ChatMessage, isLatest: boolean): Promise<ChatCompletionMessageParam> {
  const atts = m.role === "user" ? m.attachments ?? [] : [];
  if (atts.length === 0) {
    return { role: m.role, content: m.content } as ChatCompletionMessageParam;
  }

  const parts: ChatCompletionContentPart[] = [];
  const noteNames: string[] = [];

  for (const a of atts) {
    // SSRF guard: never touch an attachment URL we don't recognize as ours.
    if (!attachmentUrlAllowed(a.url)) {
      noteNames.push(a.name);
      continue;
    }
    if (a.isImage) {
      parts.push({ type: "image_url", image_url: { url: a.url } });
    } else if (isLatest && a.type === "application/pdf") {
      try {
        const fileData = await toDataUrl(a.url, a.type);
        parts.push({ type: "file", file: { filename: a.name, file_data: fileData } });
      } catch (e) {
        console.warn(`[api/chat] could not load file ${a.name}:`, e instanceof Error ? e.message : e);
        noteNames.push(a.name);
      }
    } else {
      // Older attachment, or an unreadable type: just name it.
      noteNames.push(a.name);
    }
  }

  const notes = noteNames.map((n) => `\n[ფაილი / file: ${n}]`).join("");
  parts.unshift({ type: "text", text: `${m.content}${notes}` });

  return { role: "user", content: parts };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    lang?: Lang;
  };
  const lang: Lang = body.lang === "en" ? "en" : "ka";
  const dict = getDict(lang);

  // Rate limit per IP (also caps OpenAI spend from abusive callers).
  const rl = rateLimit(`chat:${clientIp(req)}`, 20, 60_000); // 20 / min
  if (!rl.ok) {
    return NextResponse.json<ChatApiResponse>(
      { reply: dict.chat.rateLimited, control: { ...DEFAULT_CONTROL } },
      { status: 200, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    // Input bounds: keep only the most recent messages, clamp content length,
    // and cap attachments per message before anything reaches the model.
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages: ChatMessage[] = rawMessages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content.slice(0, MAX_CONTENT_CHARS) : "",
      attachments: Array.isArray(m.attachments)
        ? m.attachments.slice(0, MAX_ATTACHMENTS_PER_MSG)
        : undefined,
    }));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[api/chat] OPENAI_API_KEY is not set.");
      return NextResponse.json<ChatApiResponse>(
        { reply: dict.chat.notConfigured, control: { ...DEFAULT_CONTROL } },
        { status: 200 }
      );
    }

    // Let the SDK handle retries CORRECTLY: it only retries transient errors
    // (408/409/429/5xx + connection/timeout), honors Retry-After, and uses
    // exponential backoff. Per-attempt timeout keeps total within maxDuration.
    const openai = new OpenAI({ apiKey, maxRetries: 2, timeout: 15_000 });

    const convo = messages.filter((m) => m.role === "user" || m.role === "assistant");
    // Index of the last user message - only it gets full PDF file content.
    let lastUserIdx = -1;
    for (let i = convo.length - 1; i >= 0; i--) {
      if (convo[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    const history: ChatCompletionMessageParam[] = await Promise.all(
      convo.map((m, i) => toOpenAIMessage(m, i === lastUserIdx))
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      // Force a single JSON object so `reply` + `chips` are always structured.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + LANG_INSTRUCTION[lang] + (MARKETING_ONLY ? MARKETING_SCOPE : ""),
        },
        ...history,
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Primary path: the whole response is a JSON object { reply, ...control }.
    let reply = "";
    let control: ChatControl;
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      reply = typeof obj.reply === "string" ? obj.reply.trim() : "";
      control = normalizeControl(obj);
    } catch {
      // Fallback: tolerate prose + trailing/fenced JSON (older format).
      const parsed = parseControl(raw);
      reply = parsed.reply;
      control = parsed.control;
    }

    // Hard guard: the lead-capture form may ONLY appear in the conversion phase.
    if (control.showLeadForm && control.phase !== "conversion") {
      control.showLeadForm = false;
    }

    // The API call SUCCEEDED but the model returned no usable text. This is NOT
    // a connection failure - log it distinctly and degrade gracefully.
    if (!reply) {
      console.warn(
        `[api/chat] empty reply after parse (model returned no 'reply'). rawLen=${raw.length}`
      );
      reply = dict.chat.errorConnection;
    }

    return NextResponse.json<ChatApiResponse>({ reply, control }, { status: 200 });
  } catch (err) {
    // Differentiate the failure so we can see WHY (rate limit vs timeout vs
    // connection vs auth) instead of one opaque blob.
    logChatError(err);
    return NextResponse.json<ChatApiResponse>(
      { reply: dict.chat.errorConnection, control: { ...DEFAULT_CONTROL } },
      { status: 200 }
    );
  }
}

// Structured, greppable error log. Classifies OpenAI SDK errors by status/name.
function logChatError(err: unknown): void {
  const e = err as {
    name?: string;
    status?: number;
    code?: string | null;
    type?: string;
    message?: string;
  };
  const status = e?.status;
  const name = e?.name;
  const transient =
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500);

  let kind = "unknown";
  if (name === "APIConnectionTimeoutError") kind = "timeout";
  else if (name === "APIConnectionError") kind = "connection";
  else if (status === 429) kind = "rate_limit";
  else if (status === 401) kind = "auth";
  else if (status === 400) kind = "bad_request";
  else if (typeof status === "number" && status >= 500) kind = "openai_5xx";

  console.error(
    `[api/chat] OpenAI call failed kind=${kind} transient=${transient} ` +
      `name=${name ?? "n/a"} status=${status ?? "n/a"} code=${e?.code ?? "n/a"} ` +
      `type=${e?.type ?? "n/a"} msg=${e?.message ?? "n/a"}`
  );
}
