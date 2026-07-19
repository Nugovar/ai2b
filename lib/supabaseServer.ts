// Server-side Supabase client. Uses the SECRET key (full access, bypasses RLS)
// so it can write/read `leads`/`experts`. NEVER import this into a client
// component. Works with the new-format key (sb_secret_...); falls back to the
// legacy service_role var name.
//
// Resilience: every request uses a hard timeout, so if the project is PAUSED or
// unreachable the call fails fast instead of hanging (which would otherwise tie
// up the serverless function and spin the lead form / admin). Callers catch the
// failure and fall back to the in-memory store. The chat (OpenAI) does not use
// this client at all, so a DB outage can never affect the conversation.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the new secret key name; fall back to the legacy service_role name.
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseServerConfigured = Boolean(url && secretKey);

// Fail fast when the DB is paused/unreachable (DNS ENOTFOUND fails instantly,
// but a half-up endpoint can hang on connect — this bounds it).
const SUPABASE_TIMEOUT_MS = 6000;

// fetch wrapper that aborts after SUPABASE_TIMEOUT_MS.
const timeoutFetch: typeof fetch = (input, init) => {
  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(SUPABASE_TIMEOUT_MS)
      : undefined;
  return fetch(input, { ...init, signal: init?.signal ?? signal });
};

// Returns a privileged client, or null if env vars are missing (demo fallback)
// or DEMO_MODE is on (then the app runs entirely on the seeded in-memory store).
export function getSupabaseAdmin(): SupabaseClient | null {
  if (process.env.AI2B_DEMO === "1") return null;
  if (!url || !secretKey) return null;
  try {
    return createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timeoutFetch },
    });
  } catch (e) {
    console.error(
      "[supabaseServer] createClient() threw -> treating as unconfigured. reason:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}
