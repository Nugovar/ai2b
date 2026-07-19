// Chat-session persistence. EVERY conversation is saved (not just the ones
// that convert to a lead) — this is the "accumulated client context" moat and
// lets the admin review/recover conversations that dropped off before the lead
// form. Supabase-first with the same in-memory fallback pattern as leadStore.
//
// Written from /api/chat on each successful turn (upsert by session id), and
// flagged lead_captured from /api/lead when the visitor converts.
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import { DEMO_CHATS } from "@/lib/demoSeed";
import type { ChatMessage } from "@/lib/types";

export interface StoredChatSession {
  id: string;
  created_at: string;
  updated_at: string;
  lang: string;
  phase: string; // last control phase: discovery | advice | conversion
  lead_captured: boolean;
  messages: ChatMessage[];
}

// Client-generated session ids only — constrain the shape so arbitrary junk
// can't become a primary key.
export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

// In-memory fallback, globalThis-backed (shared across route module layers,
// survives dev HMR — same pattern as leadStore.memoryLeads).
const globalStore = globalThis as unknown as {
  __ai2bChatSessions?: Map<string, StoredChatSession>;
};
const memoryChats: Map<string, StoredChatSession> =
  (globalStore.__ai2bChatSessions ??= new Map());

// Demo mode: pre-populate once so the admin Chats tab is demonstrable.
if (process.env.AI2B_DEMO === "1" && memoryChats.size === 0) {
  for (const s of DEMO_CHATS) memoryChats.set(s.id, { ...s });
}

// Upsert a session with the latest transcript. Never throws (chat must not
// fail because persistence hiccuped) — returns false on failure instead.
export async function saveChatSession(
  id: string,
  fields: { messages: ChatMessage[]; lang: string; phase: string }
): Promise<boolean> {
  const now = new Date().toISOString();
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("chat_sessions").upsert(
        {
          id,
          updated_at: now,
          lang: fields.lang,
          phase: fields.phase,
          messages: fields.messages,
        },
        { onConflict: "id" }
      );
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[chatStore] DB UNREACHABLE saving session -> IN-MEMORY fallback. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  const existing = memoryChats.get(id);
  memoryChats.set(id, {
    id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    lang: fields.lang,
    phase: fields.phase,
    lead_captured: existing?.lead_captured ?? false,
    messages: fields.messages,
  });
  return true;
}

// Flag that this session converted into a lead. Best-effort.
export async function markChatLeadCaptured(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin
        .from("chat_sessions")
        .update({ lead_captured: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return;
    } catch (e) {
      console.error(
        "[chatStore] DB UNREACHABLE marking lead_captured. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  const s = memoryChats.get(id);
  if (s) s.lead_captured = true;
}

// All sessions, most recently active first. Admin-only callers.
export async function listChatSessions(): Promise<{
  sessions: StoredChatSession[];
  storage: "supabase" | "memory";
}> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { data, error } = await admin
        .from("chat_sessions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return { sessions: (data ?? []) as StoredChatSession[], storage: "supabase" };
    } catch (e) {
      console.error(
        "[chatStore] DB UNREACHABLE listing sessions -> IN-MEMORY fallback. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  const sessions = Array.from(memoryChats.values()).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  );
  return { sessions, storage: "memory" };
}
