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
import type { ChatApiResponse, ChatControl, ChatMessage } from "@/lib/types";

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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    lang?: Lang;
  };
  const lang: Lang = body.lang === "en" ? "en" : "ka";
  const dict = getDict(lang);

  try {
    const messages = Array.isArray(body.messages) ? body.messages : [];

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

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

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
