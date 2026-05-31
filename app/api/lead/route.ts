// Server-side lead capture endpoint. Validates minimally, then persists via
// the lead store (Supabase if configured, in-memory fallback otherwise).
import { NextRequest, NextResponse } from "next/server";
import { saveLead } from "@/lib/leadStore";
import type { Lead } from "@/lib/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts digits, spaces, +, -, parens; requires at least 9 digits.
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Lead>;

    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").trim();
    const email = (body.email ?? "").trim();

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

    const result = await saveLead({
      name,
      phone,
      email,
      business_type: body.business_type,
      summary: body.summary,
      slots: body.slots,
      advice: body.advice,
      conversation: body.conversation,
      category: body.category,
      required_skills: body.required_skills,
      ai_relevant: body.ai_relevant,
    });

    return NextResponse.json({ ok: true, id: result.id, storage: result.storage }, { status: 200 });
  } catch (err) {
    console.error("[api/lead] error:", err);
    return NextResponse.json(
      { ok: false, error: "დაფიქსირდა შეცდომა. სცადეთ ხელახლა." },
      { status: 500 }
    );
  }
}
