// Browser-side Supabase client, used ONLY to upload chat files directly to
// Storage via a server-minted signed upload URL (uploadToSignedUrl needs no
// auth - the token authorizes the single PUT). Uses the publishable/anon key,
// which is safe to expose. NEVER put the SECRET key here.
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

// Returns a cached browser client, or null if env vars are missing (the caller
// then falls back to the base64 upload route).
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  if (!client) {
    client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
