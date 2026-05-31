// Update a lead's status from the admin panel. Demo-gated by the shared key.
import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus, type LeadStatus } from "@/lib/leadStore";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

const VALID: LeadStatus[] = ["new", "in_progress", "done"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      status?: LeadStatus;
      key?: string;
    };

    if (!isAdminAuthorized(body.key)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (typeof body.id !== "string" || !body.status || !VALID.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const ok = await updateLeadStatus(body.id, body.status);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/status] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
