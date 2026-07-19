// AI Activity Log — an append-only feed of AI-related events the admin can
// watch: chat replies (technical: model/latency/tokens/cost), errors, routing
// decisions the AI made during discovery, and expert feedback on AI drafts.
// Supabase-first with the same in-memory fallback pattern as chatStore.ts.
import { randomUUID } from "crypto";
import { getSupabaseAdmin, isSupabaseServerConfigured } from "@/lib/supabaseServer";
import { DEMO_AI_EVENTS } from "@/lib/demoSeed";

export type AiEventType = "chat_reply" | "chat_error" | "match_decision" | "draft_rated";

export interface StoredAiEvent {
  id: string;
  created_at: string;
  type: AiEventType;
  ref_id?: string;
  payload: Record<string, unknown>;
}

// Approximate — update if OpenAI's published gpt-4o-mini pricing changes.
const GPT_4O_MINI_PRICE_PER_1M = { input: 0.15, output: 0.6 }; // USD

export function estimateCost(tokensIn: number, tokensOut: number): number {
  const cost =
    (tokensIn / 1_000_000) * GPT_4O_MINI_PRICE_PER_1M.input +
    (tokensOut / 1_000_000) * GPT_4O_MINI_PRICE_PER_1M.output;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimal places
}

// In-memory fallback, globalThis-backed (same pattern as chatStore.memoryChats),
// capped so a long-running dev server can't leak memory.
const MAX_MEMORY_EVENTS = 500;
const globalStore = globalThis as unknown as { __ai2bAiEvents?: StoredAiEvent[] };
const memoryEvents: StoredAiEvent[] = (globalStore.__ai2bAiEvents ??= []);

// Demo mode: pre-populate once so the admin Activity tab is demonstrable.
if (process.env.AI2B_DEMO === "1" && memoryEvents.length === 0) {
  memoryEvents.push(...DEMO_AI_EVENTS.map((e) => ({ ...e })));
}

// Never throws — callers await this for reliability (same contract as
// saveChatSession: a logging failure falls back to memory rather than
// propagating), not because it's unawaited fire-and-forget.
export async function logAiEvent(e: {
  type: AiEventType;
  ref_id?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const id = `evt_${randomUUID()}`;
  const created_at = new Date().toISOString();
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("ai_events").insert({
        id,
        created_at,
        type: e.type,
        ref_id: e.ref_id ?? null,
        payload: e.payload,
      });
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      console.error(
        "[aiEvents] DB UNREACHABLE logging event -> IN-MEMORY fallback. reason:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
  memoryEvents.push({ id, created_at, type: e.type, ref_id: e.ref_id, payload: e.payload });
  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.splice(0, memoryEvents.length - MAX_MEMORY_EVENTS);
  }
}

// Admin-only read. Newest first.
export async function listAiEvents(opts?: {
  type?: AiEventType;
  limit?: number;
}): Promise<{ events: StoredAiEvent[]; storage: "supabase" | "memory" }> {
  const limit = opts?.limit ?? 200;
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      let query = admin
        .from("ai_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (opts?.type) query = query.eq("type", opts.type);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { events: (data ?? []) as StoredAiEvent[], storage: "supabase" };
    } catch (e) {
      console.error(
        "[aiEvents] DB UNREACHABLE listing events -> IN-MEMORY fallback. reason:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }
  let events = [...memoryEvents].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (opts?.type) events = events.filter((ev) => ev.type === opts.type);
  return { events: events.slice(0, limit), storage: "memory" };
}
