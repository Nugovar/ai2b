// Lightweight health / keep-alive endpoint.
//
// Purpose: a free external pinger (cron-job.org / UptimeRobot) hits this every
// few days so the Supabase free-tier project registers activity and does not
// pause after ~7 days idle. It issues ONE trivial DB read (a head+count on
// `leads`, returns no rows) which is enough to count as database activity.
//
// Safe: never exposes secrets; always returns 200 so the pinger sees success.
// The `db` field reports the real state (ok / unreachable / unconfigured).
import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";

export const runtime = "nodejs";
// Never cache: every ping must actually reach the database.
export const dynamic = "force-dynamic";

export async function GET() {
  const time = new Date().toISOString();
  let db: "ok" | "unreachable" | "unconfigured" = "unconfigured";

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      // Minimal query: HEAD + exact count, returns no row data but runs on Postgres.
      const { error } = await admin
        .from("leads")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      if (error) throw new Error(error.message);
      db = "ok";
    } catch (e) {
      db = "unreachable";
      console.warn(
        "[api/health] DB ping failed (project paused/unreachable?):",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return NextResponse.json({ ok: true, db, time }, { status: 200 });
}
