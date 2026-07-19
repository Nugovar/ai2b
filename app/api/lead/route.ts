// Server-side lead capture endpoint. Validates minimally, then persists via
// the lead store (Supabase if configured, in-memory fallback otherwise).
import { NextRequest, NextResponse } from "next/server";
import { saveLead } from "@/lib/leadStore";
import { markChatLeadCaptured, isValidSessionId } from "@/lib/chatStore";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts digits, spaces, +, -, parens; requires at least 9 digits.
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9;
}

// Field bounds — keep stored leads sane and block oversized payloads.
const clamp = (v: unknown, max: number): string | undefined =>
  typeof v === "string" ? v.slice(0, max) : undefined;

export async function POST(req: NextRequest) {
  // Rate limit lead submissions per IP.
  const rl = rateLimit(`lead:${clientIp(req)}`, 5, 10 * 60_000); // 5 / 10 min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "ბევრი მოთხოვნა. სცადეთ ცოტა ხანში." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  try {
    const body = (await req.json()) as Partial<Lead>;

    const name = (body.name ?? "").trim().slice(0, 200);
    const phone = (body.phone ?? "").trim().slice(0, 40);
    const email = (body.email ?? "").trim().slice(0, 200);

    if (!name) {
      return NextResponse.json({ ok: false, error: "სახელი სავალდებულოა." }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { ok: false, error: "გთხოვთ, შეიყვანოთ სწორი ტელეფონის ნომერი." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: "გთხოვთ, შეიყვანოთ სწორი ელ. ფოსტა." },
        { status: 400 }
      );
    }

    // Clamp/cap the optional context fields before persisting.
    const conversation = Array.isArray(body.conversation)
      ? body.conversation.slice(-60)
      : undefined;
    const attachments = Array.isArray(body.attachments)
      ? body.attachments.slice(0, 12)
      : undefined;
    const required_skills = Array.isArray(body.required_skills)
      ? body.required_skills.slice(0, 12)
      : undefined;

    const result = await saveLead({
      name,
      phone,
      email,
      business_type: clamp(body.business_type, 200),
      summary: clamp(body.summary, 4000),
      slots: body.slots,
      advice: clamp(body.advice, 8000),
      conversation,
      category: clamp(body.category, 200),
      required_skills,
      ai_relevant: body.ai_relevant,
      attachments,
    });

    // Flag the originating chat session as converted (best-effort).
    const sessionId = (body as { sessionId?: unknown }).sessionId;
    if (isValidSessionId(sessionId)) {
      await markChatLeadCaptured(sessionId);
    }

    return NextResponse.json({ ok: true, id: result.id, storage: result.storage }, { status: 200 });
  } catch (err) {
    console.error("[api/lead] error:", err);
    return NextResponse.json(
      { ok: false, error: "დაფიქსირდა შეცდომა. სცადეთ ხელახლა." },
      { status: 500 }
    );
  }
}
