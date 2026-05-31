// Browser-side Supabase client (PUBLISHABLE key only - safe for the client).
// Works with the new-format key (sb_publishable_...). Falls back to the legacy
// anon var name if that's what's set. Returns null when unset so the demo never
// crashes.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the new publishable key name; fall back to the legacy anon name.
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null;

export const isSupabaseConfigured = Boolean(url && publishableKey);
