// Delete a lead from the admin panel. Admin-only (authorized via the admin
// cookie). Routes through the server so the Supabase SECRET key is used; never
// callable with any effect from the public site/chat.
import { NextRequest, NextResponse } from "next/server";
import { deleteLead } from "@/lib/leadStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { id?: string };

    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const ok = await deleteLead(body.id);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/delete] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
