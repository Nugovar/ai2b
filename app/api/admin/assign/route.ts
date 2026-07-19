// Assign a lead's task to an expert (or clear it). Admin-only (cookie-authed).
// The expert name is resolved server-side from the public expert directory and
// stored denormalized on the lead for display.
import { NextRequest, NextResponse } from "next/server";
import { assignLeadExpert } from "@/lib/leadStore";
import { listPublicExperts } from "@/lib/expertStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { id?: string; expertId?: string };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const expertId = typeof body.expertId === "string" ? body.expertId : "";
    let expertName = "";
    if (expertId) {
      const experts = await listPublicExperts();
      const match = experts.find((e) => e.id === expertId);
      if (!match) {
        return NextResponse.json({ ok: false, error: "unknown expert" }, { status: 400 });
      }
      expertName = match.name;
    }

    const ok = await assignLeadExpert(body.id, expertId, expertName);
    return NextResponse.json({ ok, expertName }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/assign] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
