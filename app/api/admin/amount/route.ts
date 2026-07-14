// Set a lead's deal amount (GEL). Admin-only (cookie-authed).
import { NextRequest, NextResponse } from "next/server";
import { updateLeadAmount } from "@/lib/leadStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { id?: string; amount?: number };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "bad amount" }, { status: 400 });
    }

    const ok = await updateLeadAmount(body.id, amount);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/amount] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
