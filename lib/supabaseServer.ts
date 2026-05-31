// Server-side Supabase client. Uses the SECRET key (full access, bypasses RLS)
// so it can write/read `leads`. NEVER import this into a client component.
// Works with the new-format key (sb_secret_...). Falls back to the legacy
// service_role var name if that's what's set.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the new secret key name; fall back to the legacy service_role name.
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseServerConfigured = Boolean(url && secretKey);

// Returns a privileged client, or null if env vars are missing (demo fallback).
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
