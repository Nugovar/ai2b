// Expert task submission — the north-star capture point. The expert rates how
// usable the AI's brief was (accepted / edited / rejected) and marks the task
// done. Writes the SAME `ai_draft_status` field the admin used in Phase 1, so
// the acceptance-rate metric now gets its signal straight from the expert.
//
// Auth: requires a valid expert cookie AND that the task is assigned to that
// expert (ownership check) — an expert can't rate someone else's task.
import { NextRequest, NextResponse } from "next/server";
import { getAuthedExpert } from "@/lib/expertAuth";
import { expertOwnsTask, updateLeadOutcome, updateLeadStatus } from "@/lib/leadStore";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { AiDraftStatus } from "@/lib/types";

export const runtime = "nodejs";

// The rating must be a real judgement — "unset" is not a valid submission.
const VALID_RATINGS: AiDraftStatus[] = ["accepted", "edited", "rejected"];

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`expert-submit:${ip}`, 30, 60_000); // 30 / min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const expert = await getAuthedExpert();
  if (!expert) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { taskId?: string; rating?: string };
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const rating = body.rating as AiDraftStatus;

  if (!taskId || !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Ownership: the task must be assigned to THIS expert.
  if (!(await expertOwnsTask(expert.id, taskId))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const rated = await updateLeadOutcome(taskId, { ai_draft_status: rating });
  const closed = await updateLeadStatus(taskId, "done");

  if (!rated || !closed) {
    // 404 here almost always means the migration hasn't run (missing column).
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
