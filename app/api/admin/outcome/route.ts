// Set a lead's outcome and/or AI-draft-acceptance signal. Admin-only (cookie).
import { NextRequest, NextResponse } from "next/server";
import { updateLeadOutcome } from "@/lib/leadStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import type { OutcomeStatus, AiDraftStatus } from "@/lib/types";

export const runtime = "nodejs";

const OUTCOMES: OutcomeStatus[] = ["pending", "won", "lost"];
const DRAFTS: AiDraftStatus[] = ["unset", "accepted", "edited", "rejected"];

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      outcome?: string;
      aiDraft?: string;
    };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }

    const fields: { outcome?: OutcomeStatus; ai_draft_status?: AiDraftStatus } = {};
    if (body.outcome !== undefined) {
      if (!OUTCOMES.includes(body.outcome as OutcomeStatus)) {
        return NextResponse.json({ ok: false, error: "bad outcome" }, { status: 400 });
      }
      fields.outcome = body.outcome as OutcomeStatus;
    }
    if (body.aiDraft !== undefined) {
      if (!DRAFTS.includes(body.aiDraft as AiDraftStatus)) {
        return NextResponse.json({ ok: false, error: "bad aiDraft" }, { status: 400 });
      }
      fields.ai_draft_status = body.aiDraft as AiDraftStatus;
    }
    if (!fields.outcome && !fields.ai_draft_status) {
      return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
    }

    const ok = await updateLeadOutcome(body.id, fields);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/outcome] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
