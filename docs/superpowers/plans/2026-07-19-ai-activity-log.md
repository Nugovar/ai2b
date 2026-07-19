# AI Activity Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin a live, unified feed of what the AI is doing — routing decisions, chat technical metrics (model/latency/tokens/cost), errors, and expert feedback on AI drafts — across the AI2B platform.

**Architecture:** A new append-only `ai_events` table + `lib/aiEvents.ts`, built as an exact structural mirror of the existing `lib/chatStore.ts` (Supabase-first, `globalThis`-backed in-memory fallback, demo-seeded). Three existing routes each get one `logAiEvent()` call. A new admin tab polls a new `GET /api/admin/ai-events` route every 12s.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (Postgres), Tailwind. No test framework exists in this repo (confirmed: no jest/vitest, no `*.test.ts` files anywhere) — the project's established verification convention is `npx tsc --noEmit` + manual `curl`/browser checks against a running dev server, not automated tests. Every task below follows that convention instead of a TDD test-first loop.

**Spec:** `docs/superpowers/specs/2026-07-19-ai-activity-log-design.md`

**Before starting:** ensure the demo dev server is running (used for every curl/browser verification step in this plan — never touches real Supabase data):
```bash
cd /Users/lukagvenetadze/Building/AI2B
AI2B_DEMO=1 npm run dev -- --port 3550
```
Leave it running in a background terminal for the whole plan. Next.js dev auto-recompiles on file save — no restart needed between tasks, EXCEPT immediately before Task 10's `next build` step (stop the dev server first — running `next build` while the dev server is live corrupts the shared `.next` directory; this is a documented repo gotcha).

---

### Task 1: Migration — `ai_events` table

**Files:**
- Create: `supabase/migrations/0008_ai_events.sql`

- [ ] **Step 1: Write the migration**

```sql
-- AI Activity Log: an append-only feed of AI-related events (chat replies with
-- technical metrics, errors, routing decisions, expert feedback on AI drafts)
-- for the admin "AI აქტივობა" tab. Idempotent; run after 0007. RLS on with no
-- policies = service-key only, same posture as chat_sessions/leads.
create table if not exists public.ai_events (
  id text primary key,
  created_at timestamptz not null default now(),
  type text not null,
  ref_id text,
  payload jsonb not null default '{}'::jsonb
);

alter table public.ai_events enable row level security;

create index if not exists ai_events_created_idx
  on public.ai_events (created_at desc);
create index if not exists ai_events_type_idx
  on public.ai_events (type);
```

- [ ] **Step 2: Verify it's valid, idempotent SQL**

This migration is not run against a live database in this plan (the repo's live Supabase migrations are applied manually by the user per `hot-ai2b.md`'s "before live" checklist — same as migrations 0001–0007). Verify by inspection: confirm it matches the exact idiom of `supabase/migrations/0007_chat_sessions.sql` (`create table if not exists`, RLS enabled with no policies, indexes on the list-sort columns).

```bash
cat /Users/lukagvenetadze/Building/AI2B/supabase/migrations/0007_chat_sessions.sql
cat /Users/lukagvenetadze/Building/AI2B/supabase/migrations/0008_ai_events.sql
```
Expected: both follow the identical `create table if not exists` / `enable row level security` / `create index if not exists` structure.

- [ ] **Step 3: Commit**

```bash
cd /Users/lukagvenetadze/Building/AI2B
git add supabase/migrations/0008_ai_events.sql
git commit -m "AI Activity Log: ai_events table migration"
```

---

### Task 2: `lib/aiEvents.ts` store + demo seed data

**Files:**
- Create: `lib/aiEvents.ts`
- Modify: `lib/demoSeed.ts` (append `DEMO_AI_EVENTS`)

- [ ] **Step 1: Write `lib/aiEvents.ts`**

```ts
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

// Fire-and-forget logger. Never throws — a logging failure must not affect the
// caller's actual response (same contract as saveChatSession).
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
```

- [ ] **Step 2: Append `DEMO_AI_EVENTS` to `lib/demoSeed.ts`**

Add this import near the top of `lib/demoSeed.ts`, alongside the existing `StoredChatSession` import (this creates a type-only circular reference with `lib/aiEvents.ts`, which already imports `DEMO_AI_EVENTS` from this file — safe, because `import type` is erased at compile time; the exact same pattern already exists between `chatStore.ts` and `demoSeed.ts` for `StoredChatSession`):

```ts
import type { StoredAiEvent } from "@/lib/aiEvents";
```

Then append this array at the end of the file (after the closing `];` of `DEMO_CHATS`):

```ts

// Demo AI Activity Log events: 12 distinct simulated users/sessions across all
// 4 event types, so the admin "AI Activity" tab is populated the moment it's
// opened. Reuses DEMO_LEADS ids (routing + expert-feedback events) and
// DEMO_CHATS ids (chat technical events), plus a few new session ids for
// error-path variety. Fixed timestamps, same convention as DEMO_LEADS/DEMO_CHATS.
export const DEMO_AI_EVENTS: StoredAiEvent[] = [
  {
    id: "evt-demo-01",
    created_at: "2026-07-10T09:25:45.000Z",
    type: "match_decision",
    ref_id: "demo-8",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "ui_ux"], ai_relevant: false },
  },
  {
    id: "evt-demo-02",
    created_at: "2026-07-10T14:05:00.000Z",
    type: "draft_rated",
    ref_id: "demo-8",
    payload: { rating: "edited", expert_id: "seed-tamar" },
  },
  {
    id: "evt-demo-03",
    created_at: "2026-07-11T13:50:35.000Z",
    type: "match_decision",
    ref_id: "demo-7",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "illustration"], ai_relevant: false },
  },
  {
    id: "evt-demo-04",
    created_at: "2026-07-11T19:20:00.000Z",
    type: "draft_rated",
    ref_id: "demo-7",
    payload: { rating: "accepted", expert_id: "seed-ana" },
  },
  {
    id: "evt-demo-05",
    created_at: "2026-07-12T11:05:25.000Z",
    type: "match_decision",
    ref_id: "demo-3",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["ui_ux", "illustration"], ai_relevant: false },
  },
  {
    id: "evt-demo-06",
    created_at: "2026-07-12T16:45:00.000Z",
    type: "draft_rated",
    ref_id: "demo-3",
    payload: { rating: "rejected", expert_id: "seed-ana" },
  },
  {
    id: "evt-demo-07",
    created_at: "2026-07-13T14:40:20.000Z",
    type: "match_decision",
    ref_id: "demo-2",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["social_media", "poster"], ai_relevant: true },
  },
  {
    id: "evt-demo-08",
    created_at: "2026-07-13T18:10:00.000Z",
    type: "draft_rated",
    ref_id: "demo-2",
    payload: { rating: "edited", expert_id: "seed-giorgi" },
  },
  {
    id: "evt-demo-09",
    created_at: "2026-07-13T20:15:10.000Z",
    type: "chat_error",
    ref_id: "demo-chat-quick-1",
    payload: { error_kind: "timeout", message: "Request timed out after 15000ms", model: "gpt-4o-mini" },
  },
  {
    id: "evt-demo-10",
    created_at: "2026-07-14T09:02:40.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1450, tokens_in: 620, tokens_out: 180,
      cost_estimate: 0.000201, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-11",
    created_at: "2026-07-14T09:06:10.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1680, tokens_in: 810, tokens_out: 210,
      cost_estimate: 0.000248, lang: "ka", phase: "advice",
    },
  },
  {
    id: "evt-demo-12",
    created_at: "2026-07-14T09:09:50.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-converted-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1120, tokens_in: 960, tokens_out: 140,
      cost_estimate: 0.000228, lang: "ka", phase: "conversion",
    },
  },
  {
    id: "evt-demo-13",
    created_at: "2026-07-14T09:12:30.000Z",
    type: "match_decision",
    ref_id: "demo-1",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "branding"], ai_relevant: false },
  },
  {
    id: "evt-demo-14",
    created_at: "2026-07-14T15:40:00.000Z",
    type: "draft_rated",
    ref_id: "demo-1",
    payload: { rating: "accepted", expert_id: "seed-nino" },
  },
  {
    id: "evt-demo-15",
    created_at: "2026-07-14T16:20:15.000Z",
    type: "match_decision",
    ref_id: "demo-4",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["logo", "business_card"], ai_relevant: false },
  },
  {
    id: "evt-demo-16",
    created_at: "2026-07-15T08:02:40.000Z",
    type: "match_decision",
    ref_id: "demo-5",
    payload: { category: "დიზაინი/ბრენდინგი", required_skills: ["branding", "poster"], ai_relevant: false },
  },
  {
    id: "evt-demo-17",
    created_at: "2026-07-15T10:30:00.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-urbancuts-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1580, tokens_in: 700, tokens_out: 190,
      cost_estimate: 0.000219, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-18",
    created_at: "2026-07-15T10:33:20.000Z",
    type: "chat_error",
    ref_id: "demo-chat-urbancuts-1",
    payload: { error_kind: "rate_limit", message: "429 Too Many Requests", model: "gpt-4o-mini" },
  },
  {
    id: "evt-demo-19",
    created_at: "2026-07-15T10:35:20.000Z",
    type: "match_decision",
    ref_id: "demo-6",
    payload: { category: "Marketing", required_skills: ["social_media"], ai_relevant: true },
  },
  {
    id: "evt-demo-20",
    created_at: "2026-07-15T11:20:35.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-dropped-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 1390, tokens_in: 540, tokens_out: 160,
      cost_estimate: 0.000177, lang: "ka", phase: "discovery",
    },
  },
  {
    id: "evt-demo-21",
    created_at: "2026-07-15T11:25:40.000Z",
    type: "chat_reply",
    ref_id: "demo-chat-dropped-1",
    payload: {
      model: "gpt-4o-mini", latency_ms: 2050, tokens_in: 900, tokens_out: 230,
      cost_estimate: 0.000273, lang: "ka", phase: "advice",
    },
  },
];
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/lukagvenetadze/Building/AI2B
npx tsc --noEmit
```
Expected: no errors. (If you see a circular-import error, confirm both `lib/aiEvents.ts` and `lib/demoSeed.ts` use `import type` — never a value import — for the cross-reference.)

- [ ] **Step 4: Commit**

```bash
git add lib/aiEvents.ts lib/demoSeed.ts
git commit -m "AI Activity Log: event store + demo seed data"
```

---

### Task 3: Admin read endpoint — `GET /api/admin/ai-events`

**Files:**
- Create: `app/api/admin/ai-events/route.ts`

- [ ] **Step 1: Write the route**

This is the first `GET` handler under `app/api/admin/*` in the repo (every existing admin API route only exports `POST`) — same auth convention (`isAdminRequestAuthorized()` → 401 JSON on failure), same `runtime = "nodejs"` export.

```ts
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
```

- [ ] **Step 2: Verify the full read path end-to-end**

With the demo dev server running on :3550:
```bash
curl -s http://localhost:3550/api/admin/ai-events | python3 -m json.tool | head -40
```
Expected: `"ok": true`, `"storage": "memory"`, and an `"events"` array whose first entries are the most recent demo events (`evt-demo-21`, `evt-demo-19`, ... newest `created_at` first). Confirm the count:
```bash
curl -s http://localhost:3550/api/admin/ai-events | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['events']))"
```
Expected: `21`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/ai-events/route.ts
git commit -m "AI Activity Log: admin polling endpoint"
```

---

### Task 4: i18n — `lib/i18n.ts`

**Files:**
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Extend the `AdminDict` interface**

Find this line (currently line 109):
```ts
  tabs: { leads: string; experts: string; metrics: string; chats: string };
```
Replace with:
```ts
  tabs: { leads: string; experts: string; metrics: string; chats: string; activity: string };
```

Then, immediately after the existing `chats: { ... };` block in the interface (after its closing `};`, before `logout: string;`), insert:
```ts
  activitySubtitle: string;
  activity: {
    total: string;
    empty: string;
    emptyHint: string;
    filterAll: string;
    filterChat: string;
    filterErrors: string;
    filterRouting: string;
    filterFeedback: string;
    typeChatReply: string;
    typeChatError: string;
    typeMatchDecision: string;
    typeDraftRated: string;
    model: string;
    latency: string;
    tokensIn: string;
    tokensOut: string;
    cost: string;
    errorKind: string;
    category: string;
    skills: string;
    expert: string;
  };
```

- [ ] **Step 2: Add the `ka` values**

Find (currently line 311):
```ts
    tabs: { leads: "ლიდები", experts: "ექსპერტები", metrics: "მეტრიკები", chats: "ჩატები" },
```
Replace with:
```ts
    tabs: { leads: "ლიდები", experts: "ექსპერტები", metrics: "მეტრიკები", chats: "ჩატები", activity: "AI აქტივობა" },
```

Immediately after the `chats: { ... },` block that follows (before `logout: "გასვლა",`), insert:
```ts
    activitySubtitle: "AI-ს გადაწყვეტილებები, ტექნიკური მეტრიკები და ექსპერტის უკუკავშირი — რეალურ დროში",
    activity: {
      total: "სულ",
      empty: "აქტივობა ჯერ არ არის",
      emptyHint: "AI-ს ყოველი პასუხი, routing გადაწყვეტილება და ექსპერტის შეფასება აქ გამოჩნდება ავტომატურად.",
      filterAll: "ყველა",
      filterChat: "ჩატი",
      filterErrors: "შეცდომები",
      filterRouting: "როუთინგი",
      filterFeedback: "ექსპერტის უკუკავშირი",
      typeChatReply: "AI პასუხი",
      typeChatError: "AI შეცდომა",
      typeMatchDecision: "როუთინგის გადაწყვეტილება",
      typeDraftRated: "ბრიფის შეფასება",
      model: "მოდელი",
      latency: "ლატენსია",
      tokensIn: "input ტოკენი",
      tokensOut: "output ტოკენი",
      cost: "ხარჯი (≈$)",
      errorKind: "შეცდომის ტიპი",
      category: "კატეგორია",
      skills: "საჭირო უნარები",
      expert: "ექსპერტი",
    },
```

- [ ] **Step 3: Add the `en` values**

Find (currently line 572):
```ts
    tabs: { leads: "Leads", experts: "Experts", metrics: "Metrics", chats: "Chats" },
```
Replace with:
```ts
    tabs: { leads: "Leads", experts: "Experts", metrics: "Metrics", chats: "Chats", activity: "AI Activity" },
```

Immediately after the `chats: { ... },` block that follows (before `logout: "Log out",`), insert:
```ts
    activitySubtitle: "AI decisions, technical metrics, and expert feedback — in real time",
    activity: {
      total: "Total",
      empty: "No activity yet",
      emptyHint: "Every AI reply, routing decision, and expert rating appears here automatically.",
      filterAll: "All",
      filterChat: "Chat",
      filterErrors: "Errors",
      filterRouting: "Routing",
      filterFeedback: "Expert feedback",
      typeChatReply: "AI reply",
      typeChatError: "AI error",
      typeMatchDecision: "Routing decision",
      typeDraftRated: "Draft rated",
      model: "Model",
      latency: "Latency",
      tokensIn: "Input tokens",
      tokensOut: "Output tokens",
      cost: "Cost (≈$)",
      errorKind: "Error kind",
      category: "Category",
      skills: "Required skills",
      expert: "Expert",
    },
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors. TypeScript checks the `ka`/`en` object literals against the `Dict`/`AdminDict` interface, so any missing or misspelled key in either language block fails here.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts
git commit -m "AI Activity Log: ka/en admin strings"
```

---

### Task 5: `AdminTabs.tsx` — add the Activity tab

**Files:**
- Modify: `components/AdminTabs.tsx`

- [ ] **Step 1: Extend the `active` union and tabs array**

Change:
```ts
export default function AdminTabs({
  active,
}: {
  active: "leads" | "experts" | "metrics" | "chats";
}) {
  const { t } = useApp();
  const tabs = [
    { id: "leads" as const, label: t.admin.tabs.leads, href: "/admin" },
    { id: "experts" as const, label: t.admin.tabs.experts, href: "/admin/experts" },
    { id: "metrics" as const, label: t.admin.tabs.metrics, href: "/admin/metrics" },
    { id: "chats" as const, label: t.admin.tabs.chats, href: "/admin/chats" },
  ];
```
To:
```ts
export default function AdminTabs({
  active,
}: {
  active: "leads" | "experts" | "metrics" | "chats" | "activity";
}) {
  const { t } = useApp();
  const tabs = [
    { id: "leads" as const, label: t.admin.tabs.leads, href: "/admin" },
    { id: "experts" as const, label: t.admin.tabs.experts, href: "/admin/experts" },
    { id: "metrics" as const, label: t.admin.tabs.metrics, href: "/admin/metrics" },
    { id: "chats" as const, label: t.admin.tabs.chats, href: "/admin/chats" },
    { id: "activity" as const, label: t.admin.tabs.activity, href: "/admin/activity" },
  ];
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Verify in the running demo server**

```bash
curl -s http://localhost:3550/admin/chats | grep -o "AI აქტივობა"
```
Expected: prints `AI აქტივობა` (the new tab now renders on every existing admin page, since they all render `<AdminTabs active="..." />`). The link target `/admin/activity` doesn't exist yet (404) — that's expected until Task 6.

- [ ] **Step 4: Commit**

```bash
git add components/AdminTabs.tsx
git commit -m "AI Activity Log: add tab to admin nav"
```

---

### Task 6: Admin Activity page + table

**Files:**
- Create: `app/admin/activity/page.tsx`
- Create: `components/AdminActivityTable.tsx`

- [ ] **Step 1: Write `app/admin/activity/page.tsx`**

```tsx
// Admin AI Activity Log. Server-rendered initial feed (avoids an empty flash
// before the client's first poll), gated by the httpOnly admin cookie like
// the other admin pages.
import { listAiEvents } from "@/lib/aiEvents";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";
import AdminActivityTable from "@/components/AdminActivityTable";
import AdminLogin from "@/components/AdminLogin";

// Always render fresh (events change at runtime).
export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  if (!isAdminRequestAuthorized()) {
    return <AdminLogin />;
  }

  const { events, storage } = await listAiEvents({ limit: 200 });
  return <AdminActivityTable initialEvents={events} initialStorage={storage} />;
}
```

- [ ] **Step 2: Write `components/AdminActivityTable.tsx`**

```tsx
"use client";

// Admin AI Activity Log: a live feed of AI routing decisions, chat technical
// metrics (model/latency/tokens/cost), errors, and expert feedback on AI
// drafts. Read-only. Polls /api/admin/ai-events every 12s so the admin can
// watch activity without reloading.
import { useEffect, useState } from "react";
import type { AiEventType, StoredAiEvent } from "@/lib/aiEvents";
import { useApp } from "@/components/ChatProvider";
import AdminTabs from "@/components/AdminTabs";
import AdminLangToggle from "@/components/AdminLangToggle";

const POLL_MS = 12_000;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

type FilterKey = "all" | AiEventType;

export default function AdminActivityTable({
  initialEvents,
  initialStorage,
}: {
  initialEvents: StoredAiEvent[];
  initialStorage: "supabase" | "memory";
}) {
  const { t } = useApp();
  const A = t.admin;
  const C = A.activity;

  const [events, setEvents] = useState<StoredAiEvent[]>(initialEvents);
  const [storage, setStorage] = useState<"supabase" | "memory">(initialStorage);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/ai-events");
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          events?: StoredAiEvent[];
          storage?: "supabase" | "memory";
        };
        if (data.ok && data.events) {
          setEvents(data.events);
          if (data.storage) setStorage(data.storage);
        }
      } catch {
        // Best-effort polling — a failed tick just waits for the next one.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: C.filterAll },
    { key: "chat_reply", label: C.filterChat },
    { key: "chat_error", label: C.filterErrors },
    { key: "match_decision", label: C.filterRouting },
    { key: "draft_rated", label: C.filterFeedback },
  ];

  const visible = filter === "all" ? events : events.filter((e) => e.type === filter);

  const typeLabel: Record<AiEventType, string> = {
    chat_reply: C.typeChatReply,
    chat_error: C.typeChatError,
    match_decision: C.typeMatchDecision,
    draft_rated: C.typeDraftRated,
  };
  const typeStyle: Record<AiEventType, string> = {
    chat_reply: "border-blue-300 bg-blue-50 text-blue-700",
    chat_error: "border-red-300 bg-red-50 text-red-700",
    match_decision: "border-purple-300 bg-purple-50 text-purple-700",
    draft_rated: "border-green-300 bg-green-50 text-green-700",
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-dark ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo2.png" alt="AI2Business" className="h-full w-full object-cover" />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight">{A.panelTitle}</h1>
              <p className="text-xs text-white/50">{A.activitySubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <AdminLangToggle />
            <a href="/" className="text-sm text-white/70 transition-colors hover:text-white">
              {A.backToSite}
            </a>
          </div>
        </div>
        <AdminTabs active="activity" />
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-dark px-3 py-1 text-sm font-semibold text-white">
            {C.total}: {visible.length}
          </span>
          <span className="text-xs text-gray-500">
            {A.source}: {storage === "supabase" ? A.sourceSupabase : A.sourceMemory}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.key
                  ? "border-brand-red bg-brand-red text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:border-brand-red hover:text-brand-red"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <p className="text-lg font-semibold text-brand-dark">{C.empty}</p>
            <p className="mt-1 text-sm text-gray-400">{C.emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeStyle[ev.type]}`}>
                    {typeLabel[ev.type]}
                  </span>
                  <span className="text-xs text-gray-400">{fmtTime(ev.created_at)}</span>
                  {ev.ref_id && <span className="text-xs text-gray-400">· {ev.ref_id}</span>}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  {ev.type === "chat_reply" && (
                    <>
                      <span>{C.model}: {String(ev.payload.model ?? "—")}</span>
                      <span>{C.latency}: {String(ev.payload.latency_ms ?? "—")}ms</span>
                      <span>{C.tokensIn}/{C.tokensOut}: {String(ev.payload.tokens_in ?? "—")}/{String(ev.payload.tokens_out ?? "—")}</span>
                      <span>{C.cost}: ${String(ev.payload.cost_estimate ?? "—")}</span>
                      <span>{String(ev.payload.lang ?? "—")} · {String(ev.payload.phase ?? "—")}</span>
                    </>
                  )}
                  {ev.type === "chat_error" && (
                    <>
                      <span className="font-semibold text-brand-red">{C.errorKind}: {String(ev.payload.error_kind ?? "—")}</span>
                      <span>{C.model}: {String(ev.payload.model ?? "—")}</span>
                    </>
                  )}
                  {ev.type === "match_decision" && (
                    <>
                      <span>{C.category}: {A.categoryLabel[String(ev.payload.category ?? "")] ?? String(ev.payload.category ?? "—")}</span>
                      <span>
                        {C.skills}:{" "}
                        {Array.isArray(ev.payload.required_skills)
                          ? (ev.payload.required_skills as string[]).map((s) => A.skills[s] ?? s).join(", ")
                          : "—"}
                      </span>
                      {ev.payload.ai_relevant === true && (
                        <span className="font-semibold text-brand-red">{A.metrics.aiRelevant}</span>
                      )}
                    </>
                  )}
                  {ev.type === "draft_rated" && (
                    <>
                      <span className="font-semibold">
                        {A.aiDraft[String(ev.payload.rating ?? "unset") as "accepted" | "edited" | "rejected" | "unset"]}
                      </span>
                      <span>{C.expert}: {String(ev.payload.expert_id ?? "—")}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify in the running demo server**

```bash
curl -s http://localhost:3550/admin/activity | grep -o "evt-demo-01\|AI აქტივობა\|21" | sort -u
```
Expected output includes `AI აქტივობა` (page renders with the header/tab). Note: `evt-demo-*` ids are not printed in the UI (only used as React `key`s), so grep for a payload value instead to confirm seeded data actually rendered:
```bash
curl -s http://localhost:3550/admin/activity | grep -o "rate_limit\|timeout\|seed-tamar"
```
Expected: prints all three — confirms `chat_error` rows (rate_limit, timeout) and a `draft_rated` row (seed-tamar) are present in the server-rendered HTML.

- [ ] **Step 5: Commit**

```bash
git add app/admin/activity/page.tsx components/AdminActivityTable.tsx
git commit -m "AI Activity Log: admin page + feed UI"
```

---

### Task 7: Instrument `app/api/chat/route.ts`

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add the import**

At the top, alongside the other `@/lib/*` imports:
```ts
import { saveChatSession, isValidSessionId } from "@/lib/chatStore";
```
becomes:
```ts
import { saveChatSession, isValidSessionId } from "@/lib/chatStore";
import { logAiEvent, estimateCost } from "@/lib/aiEvents";
```

- [ ] **Step 2: Time the OpenAI call**

Change:
```ts
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      // Force a single JSON object so `reply` + `chips` are always structured.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + LANG_INSTRUCTION[lang] + (MARKETING_ONLY ? MARKETING_SCOPE : ""),
        },
        ...history,
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
```
To:
```ts
    const t0 = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      // Force a single JSON object so `reply` + `chips` are always structured.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + LANG_INSTRUCTION[lang] + (MARKETING_ONLY ? MARKETING_SCOPE : ""),
        },
        ...history,
      ],
    });
    const latencyMs = Date.now() - t0;
    const usage = completion.usage;

    const raw = completion.choices[0]?.message?.content ?? "";
```

- [ ] **Step 3: Log the empty-completion soft-fail as `chat_error`, and skip the later `chat_reply`**

Change:
```ts
    // The API call SUCCEEDED but the model returned no usable text. This is NOT
    // a connection failure - log it distinctly and degrade gracefully.
    if (!reply) {
      console.warn(
        `[api/chat] empty reply after parse (model returned no 'reply'). rawLen=${raw.length}`
      );
      reply = dict.chat.errorConnection;
    }

    // Persist the session (every conversation, converted or not — the context
    // moat + lost-lead recovery). Awaited so serverless can't kill the write;
    // never throws, so a storage hiccup can't fail the chat.
    if (isValidSessionId(body.sessionId)) {
      await saveChatSession(body.sessionId, {
        messages: [...messages, { role: "assistant", content: reply }],
        lang,
        phase: control.phase,
      });
    }

    return NextResponse.json<ChatApiResponse>({ reply, control }, { status: 200 });
```
To:
```ts
    // The API call SUCCEEDED but the model returned no usable text. This is NOT
    // a connection failure - log it distinctly and degrade gracefully.
    const isEmptyCompletion = !reply;
    if (isEmptyCompletion) {
      console.warn(
        `[api/chat] empty reply after parse (model returned no 'reply'). rawLen=${raw.length}`
      );
      await logAiEvent({
        type: "chat_error",
        ref_id: isValidSessionId(body.sessionId) ? body.sessionId : undefined,
        payload: { error_kind: "empty_completion", message: `rawLen=${raw.length}`, model: "gpt-4o-mini" },
      });
      reply = dict.chat.errorConnection;
    }

    // Persist the session (every conversation, converted or not — the context
    // moat + lost-lead recovery). Awaited so serverless can't kill the write;
    // never throws, so a storage hiccup can't fail the chat.
    if (isValidSessionId(body.sessionId)) {
      await saveChatSession(body.sessionId, {
        messages: [...messages, { role: "assistant", content: reply }],
        lang,
        phase: control.phase,
      });
    }

    // Log the AI Activity feed entry for this turn — a successful reply, or
    // (if we already logged empty_completion above) nothing further.
    if (!isEmptyCompletion) {
      await logAiEvent({
        type: "chat_reply",
        ref_id: isValidSessionId(body.sessionId) ? body.sessionId : undefined,
        payload: {
          model: "gpt-4o-mini",
          latency_ms: latencyMs,
          tokens_in: usage?.prompt_tokens ?? null,
          tokens_out: usage?.completion_tokens ?? null,
          cost_estimate: usage ? estimateCost(usage.prompt_tokens, usage.completion_tokens) : null,
          lang,
          phase: control.phase,
        },
      });
    }

    return NextResponse.json<ChatApiResponse>({ reply, control }, { status: 200 });
```

- [ ] **Step 4: Extract the error classification and log `chat_error` in the catch block**

Change:
```ts
// Structured, greppable error log. Classifies OpenAI SDK errors by status/name.
function logChatError(err: unknown): void {
  const e = err as {
    name?: string;
    status?: number;
    code?: string | null;
    type?: string;
    message?: string;
  };
  const status = e?.status;
  const name = e?.name;
  const transient =
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500);

  let kind = "unknown";
  if (name === "APIConnectionTimeoutError") kind = "timeout";
  else if (name === "APIConnectionError") kind = "connection";
  else if (status === 429) kind = "rate_limit";
  else if (status === 401) kind = "auth";
  else if (status === 400) kind = "bad_request";
  else if (typeof status === "number" && status >= 500) kind = "openai_5xx";

  console.error(
    `[api/chat] OpenAI call failed kind=${kind} transient=${transient} ` +
      `name=${name ?? "n/a"} status=${status ?? "n/a"} code=${e?.code ?? "n/a"} ` +
      `type=${e?.type ?? "n/a"} msg=${e?.message ?? "n/a"}`
  );
}
```
To (same console output, `kind` computation extracted so the catch block can reuse it for the event payload):
```ts
// Classifies an OpenAI SDK error by status/name. Shared by the console log
// below and the AI Activity Log's chat_error event.
function classifyChatErrorKind(err: unknown): string {
  const e = err as { name?: string; status?: number };
  if (e?.name === "APIConnectionTimeoutError") return "timeout";
  if (e?.name === "APIConnectionError") return "connection";
  if (e?.status === 429) return "rate_limit";
  if (e?.status === 401) return "auth";
  if (e?.status === 400) return "bad_request";
  if (typeof e?.status === "number" && e.status >= 500) return "openai_5xx";
  return "unknown";
}

// Structured, greppable error log. Classifies OpenAI SDK errors by status/name.
function logChatError(err: unknown): void {
  const e = err as {
    name?: string;
    status?: number;
    code?: string | null;
    type?: string;
    message?: string;
  };
  const status = e?.status;
  const name = e?.name;
  const transient =
    name === "APIConnectionError" ||
    name === "APIConnectionTimeoutError" ||
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500);
  const kind = classifyChatErrorKind(err);

  console.error(
    `[api/chat] OpenAI call failed kind=${kind} transient=${transient} ` +
      `name=${name ?? "n/a"} status=${status ?? "n/a"} code=${e?.code ?? "n/a"} ` +
      `type=${e?.type ?? "n/a"} msg=${e?.message ?? "n/a"}`
  );
}
```

Then change the catch block:
```ts
  } catch (err) {
    // Differentiate the failure so we can see WHY (rate limit vs timeout vs
    // connection vs auth) instead of one opaque blob.
    logChatError(err);
    return NextResponse.json<ChatApiResponse>(
      { reply: dict.chat.errorConnection, control: { ...DEFAULT_CONTROL } },
      { status: 200 }
    );
  }
```
To:
```ts
  } catch (err) {
    // Differentiate the failure so we can see WHY (rate limit vs timeout vs
    // connection vs auth) instead of one opaque blob.
    logChatError(err);
    await logAiEvent({
      type: "chat_error",
      ref_id: isValidSessionId(body.sessionId) ? body.sessionId : undefined,
      payload: {
        error_kind: classifyChatErrorKind(err),
        message: err instanceof Error ? err.message : String(err),
        model: "gpt-4o-mini",
      },
    });
    return NextResponse.json<ChatApiResponse>(
      { reply: dict.chat.errorConnection, control: { ...DEFAULT_CONTROL } },
      { status: 200 }
    );
  }
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Verify end-to-end against the running demo server**

This calls the real OpenAI API (requires `OPENAI_API_KEY` to be set in `.env.local`, same as every prior manual chat verification in this project):
```bash
SID="verify$(date +%s)abcdefgh"
curl -s -X POST http://localhost:3550/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"მაინტერესებს ლოგოს დიზაინი კაფესთვის\"}],\"lang\":\"ka\",\"sessionId\":\"$SID\"}" \
  | python3 -m json.tool | head -20
```
Then confirm a new `chat_reply` (or `chat_error`, if the call failed) event was logged with a matching `ref_id`:
```bash
curl -s http://localhost:3550/api/admin/ai-events | python3 -c "
import json, sys
d = json.load(sys.stdin)
sid = '$SID'
matches = [e for e in d['events'] if e.get('ref_id') == sid]
print(f'found {len(matches)} event(s) for session {sid}')
print(json.dumps(matches, indent=2, ensure_ascii=False))
"
```
Expected: `found 1 event(s)`, `type` is `chat_reply` with a populated `latency_ms`/`tokens_in`/`tokens_out`/`cost_estimate` (or `chat_error` with a `error_kind` if the OpenAI call itself failed — either outcome confirms the instrumentation fired).

- [ ] **Step 7: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "AI Activity Log: instrument chat replies + errors"
```

---

### Task 8: Instrument `app/api/lead/route.ts`

**Files:**
- Modify: `app/api/lead/route.ts`

- [ ] **Step 1: Add the import**

```ts
import { saveLead } from "@/lib/leadStore";
```
becomes:
```ts
import { saveLead } from "@/lib/leadStore";
import { logAiEvent } from "@/lib/aiEvents";
```

- [ ] **Step 2: Extract `category` and log `match_decision` after the lead is saved**

Change:
```ts
    const required_skills = Array.isArray(body.required_skills)
      ? body.required_skills.slice(0, 12)
      : undefined;

    const result = await saveLead({
      name,
      phone,
      email,
      business_type: clamp(body.business_type, 200),
      summary: clamp(body.summary, 4000),
      slots: body.slots,
      advice: clamp(body.advice, 8000),
      conversation,
      category: clamp(body.category, 200),
      required_skills,
      ai_relevant: body.ai_relevant,
      attachments,
    });
```
To:
```ts
    const required_skills = Array.isArray(body.required_skills)
      ? body.required_skills.slice(0, 12)
      : undefined;
    const category = clamp(body.category, 200);

    const result = await saveLead({
      name,
      phone,
      email,
      business_type: clamp(body.business_type, 200),
      summary: clamp(body.summary, 4000),
      slots: body.slots,
      advice: clamp(body.advice, 8000),
      conversation,
      category,
      required_skills,
      ai_relevant: body.ai_relevant,
      attachments,
    });

    // Log the AI's routing decision — the category/skills it assigned during
    // discovery — once, at the moment the lead is captured.
    if (category) {
      await logAiEvent({
        type: "match_decision",
        ref_id: result.id,
        payload: {
          category,
          required_skills: required_skills ?? [],
          ai_relevant: Boolean(body.ai_relevant),
        },
      });
    }
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify end-to-end against the running demo server**

```bash
curl -s -X POST http://localhost:3550/api/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ვერიფიკაცია ტესტი",
    "phone": "+995599112233",
    "email": "verify-lead@example.com",
    "category": "დიზაინი/ბრენდინგი",
    "required_skills": ["logo"],
    "ai_relevant": false
  }' | python3 -m json.tool
```
Note the returned `"id"` (e.g. `"id-123"`), then:
```bash
curl -s http://localhost:3550/api/admin/ai-events | python3 -c "
import json, sys
d = json.load(sys.stdin)
matches = [e for e in d['events'] if e['type'] == 'match_decision' and e.get('ref_id') == '<paste id here>']
print(json.dumps(matches, indent=2, ensure_ascii=False))
"
```
Expected: one `match_decision` event with `payload.category == \"დიზაინი/ბრენდინგი\"` and `payload.required_skills == [\"logo\"]`.

- [ ] **Step 5: Commit**

```bash
git add app/api/lead/route.ts
git commit -m "AI Activity Log: instrument routing decisions on lead capture"
```

---

### Task 9: Instrument `app/api/expert/submit/route.ts`

**Files:**
- Modify: `app/api/expert/submit/route.ts`

- [ ] **Step 1: Add the import**

```ts
import { rateLimit, clientIp } from "@/lib/rateLimit";
```
becomes:
```ts
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { logAiEvent } from "@/lib/aiEvents";
```

- [ ] **Step 2: Log `draft_rated` after a successful write**

Change:
```ts
  const rated = await updateLeadOutcome(taskId, { ai_draft_status: rating });
  const closed = await updateLeadStatus(taskId, "done");

  if (!rated || !closed) {
    // 404 here almost always means the migration hasn't run (missing column).
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
```
To:
```ts
  const rated = await updateLeadOutcome(taskId, { ai_draft_status: rating });
  const closed = await updateLeadStatus(taskId, "done");

  if (!rated || !closed) {
    // 404 here almost always means the migration hasn't run (missing column).
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 404 });
  }

  await logAiEvent({
    type: "draft_rated",
    ref_id: taskId,
    payload: { rating, expert_id: expert.id },
  });

  return NextResponse.json({ ok: true });
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify end-to-end against the running demo server**

Log in as the demo expert Tamar (assigned to `demo-4`, currently `in_progress` / `ai_draft_status: unset` — a clean target for this check), then rate the AI brief:
```bash
curl -s -c /tmp/ai2b-expert-cookie.txt -X POST http://localhost:3550/api/expert/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tamar@ai2b.ge","code":"TAMAR-1592"}'
```
Expected: `{"ok":true,"name":"..."}`. Then:
```bash
curl -s -b /tmp/ai2b-expert-cookie.txt -X POST http://localhost:3550/api/expert/submit \
  -H "Content-Type: application/json" \
  -d '{"taskId":"demo-4","rating":"accepted"}'
```
Expected: `{"ok":true}`. Then confirm the event:
```bash
curl -s http://localhost:3550/api/admin/ai-events | python3 -c "
import json, sys
d = json.load(sys.stdin)
matches = [e for e in d['events'] if e['type'] == 'draft_rated' and e.get('ref_id') == 'demo-4']
print(json.dumps(matches, indent=2, ensure_ascii=False))
"
```
Expected: one `draft_rated` event with `payload.rating == \"accepted\"` and `payload.expert_id == \"seed-tamar\"`.

- [ ] **Step 5: Commit**

```bash
git add app/api/expert/submit/route.ts
git commit -m "AI Activity Log: instrument expert feedback on AI drafts"
```

---

### Task 10: Full regression + browser verification

**Files:** none (verification only)

- [ ] **Step 1: Stop the dev server, then run a clean build**

Running `next build` while the dev server is live corrupts the shared `.next` directory (documented repo gotcha) — stop it first.
```bash
cd /Users/lukagvenetadze/Building/AI2B
# stop the ai2b-demo dev server process (Ctrl-C in its terminal, or kill the process on :3550)
rm -rf .next
npm run build
```
Expected: build completes with no TypeScript or ESLint errors (warnings are pre-existing and fine; look specifically for new errors touching `lib/aiEvents.ts`, `lib/demoSeed.ts`, `lib/i18n.ts`, `app/api/chat/route.ts`, `app/api/lead/route.ts`, `app/api/expert/submit/route.ts`, `app/api/admin/ai-events/route.ts`, `app/admin/activity/page.tsx`, `components/AdminActivityTable.tsx`, `components/AdminTabs.tsx`).

- [ ] **Step 2: Restart the demo dev server**

```bash
AI2B_DEMO=1 npm run dev -- --port 3550
```

- [ ] **Step 3: Browser walkthrough**

Open `http://localhost:3550/admin/activity` in a browser. Confirm:
- The page loads with the "AI აქტივობა" tab highlighted active in the nav.
- 21+ events are listed (21 seed events, plus any left over from Tasks 7–9's live verification calls), newest first.
- Filter chips (All / Chat / Errors / Routing / Expert feedback) narrow the list correctly when clicked.
- A `chat_reply` row shows model/latency/tokens/cost; a `chat_error` row shows the error kind in red; a `match_decision` row shows category + skills; a `draft_rated` row shows the AI-draft label (accepted/edited/rejected) + expert id.
- Wait ~15 seconds without touching anything — the "storage" indicator and event list should silently refresh (open browser devtools Network tab and confirm a `GET /api/admin/ai-events` request fires every ~12s).
- Toggle the ქარ/ENG language switch — all Activity tab labels (tab name, filter chips, field labels) switch language along with the rest of the admin panel.

- [ ] **Step 4: Final confirmation on the branch**

```bash
git log --oneline feat/expert-portal..HEAD
git status
```
Expected: a clean working tree, and one commit per task above (7 feature commits + this plan/spec commit), all on `feat/ai-activity-log`.

- [ ] **Step 5: Report completion**

No further commit needed for this task (verification only). This branch is now ready for Luka to review and decide on merge order relative to the still-unmerged `harden/admin-auth` and `feat/expert-portal` branches (per the existing "before live" checklist in `wiki/hot-ai2b.md`).

---

## Self-Review Notes

**Spec coverage:** Migration (Task 1) ✓. `lib/aiEvents.ts` store + cost estimate (Task 2) ✓. Demo seed, 12 distinct ref_ids across all 4 types incl. both a `rate_limit` and a `timeout` error example (Task 2) ✓. Admin read endpoint (Task 3) ✓. i18n (Task 4) ✓. Tab (Task 5) ✓. Admin page + filterable/polling UI (Task 6) ✓. All three instrumentation points — chat (Task 7), lead/routing (Task 8), expert feedback (Task 9) ✓. Out-of-scope items from the spec (pre-send gating, client-side AI tool, charts, deep-linking, retention jobs) are correctly absent from every task above.

**Type consistency:** `AiEventType`/`StoredAiEvent` defined once in `lib/aiEvents.ts` (Task 2) and imported (never redefined) everywhere else it's used — `demoSeed.ts` (type-only), `app/api/admin/ai-events/route.ts`, `app/admin/activity/page.tsx`, `components/AdminActivityTable.tsx`. `logAiEvent`/`listAiEvents`/`estimateCost` signatures introduced in Task 2 are called identically (same parameter names/shapes) in every later task. `t.admin.activity.*` / `t.admin.tabs.activity` keys introduced in Task 4 match exactly what Task 6's component reads (`C.total`, `C.filterAll`, etc. — cross-checked key-by-key against the Task 4 interface).
