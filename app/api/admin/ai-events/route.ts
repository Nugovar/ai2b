// AI Activity Log polling endpoint. Admin-only; the activity tab polls this
// every 12s to refresh the feed without a full page reload.
import { NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import { listAiEvents } from "@/lib/aiEvents";

export const runtime = "nodejs";

export async function GET() {
  if (!isAdminRequestAuthorized()) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { events, storage } = await listAiEvents({ limit: 200 });
  return NextResponse.json({ ok: true, events, storage });
}
