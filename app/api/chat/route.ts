// Server-side chat endpoint. The OpenAI key lives ONLY here (server env).
// Receives the full message history + active language, calls gpt-4o-mini with
// the system prompt, parses the control JSON out of the reply, and returns
// { reply, control }.
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { parseControl, normalizeControl } from "@/lib/parseControl";
import { getDict, type Lang } from "@/lib/i18n";
import type { ChatApiResponse, ChatControl, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

// Language instruction appended to the system prompt so replies + chips match
// the user's selected language.
const LANG_INSTRUCTION: Record<Lang, string> = {
  ka: "\n\nIMPORTANT: Respond ONLY in Georgian (ქართულად). The chips array must also be in Georgian.",
  en: "\n\nIMPORTANT: Respond ONLY in English. The chips array must also be in English.",
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
        {
          reply: dict.chat.notConfigured,
          control: { phase: "discovery", slots: {}, showLeadForm: false, chips: [] },
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    // Retry transient connection errors (the network here intercepts TLS and
    // occasionally drops the request). Up to 3 attempts with a short backoff.
    const params = {
      model: "gpt-4o-mini" as const,
      temperature: 0.6,
      // Force a single JSON object so `reply` + `chips` are always structured.
      response_format: { type: "json_object" as const },
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT + LANG_INSTRUCTION[lang] },
        ...history,
      ],
    };
    let completion: Awaited<ReturnType<typeof openai.chat.completions.create>> | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        completion = await openai.chat.completions.create(params);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    if (!completion) throw lastErr;

    const raw = ("choices" in completion ? completion.choices[0]?.message?.content : "") ?? "";

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
    // Prevents the model from jumping to contact capture during discovery/advice.
    if (control.showLeadForm && control.phase !== "conversion") {
      control.showLeadForm = false;
    }

    return NextResponse.json<ChatApiResponse>(
      { reply: reply || dict.chat.errorConnection, control },
      { status: 200 }
    );
  } catch (err) {
    console.error("[api/chat] error:", err);
    return NextResponse.json<ChatApiResponse>(
      {
        reply: dict.chat.errorConnection,
        control: { phase: "discovery", slots: {}, showLeadForm: false, chips: [] },
      },
      { status: 200 }
    );
  }
}
