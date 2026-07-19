// Update a lead's payment status (unpaid / invoiced / paid). Admin-only
// (cookie-authed).
import { NextRequest, NextResponse } from "next/server";
import { updatePaymentStatus } from "@/lib/leadStore";
import type { PaymentStatus } from "@/lib/types";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

const VALID: PaymentStatus[] = ["unpaid", "invoiced", "paid"];

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { id?: string; status?: PaymentStatus };
    if (typeof body.id !== "string" || !body.status || !VALID.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const ok = await updatePaymentStatus(body.id, body.status);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/payment] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
