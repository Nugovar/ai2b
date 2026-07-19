# AI Activity Log — Design Spec

**Date:** 2026-07-19
**Status:** Approved (brainstorm) — ready for implementation plan
**Branch:** `feat/ai-activity-log` (stacked on `feat/expert-portal`)

## Problem

Luka (CTO) wants live visibility into what the AI is actually doing across the
platform — not just the north-star acceptance-rate metric already shipped,
but a real-time, human-readable feed an admin can watch: what the AI decided
in chat, how it routed leads, what it cost/how fast it was, and whether
experts trusted its output. Nothing today unifies these — they're scattered
across the Chats tab (transcripts only, no technical data), the lead record
(current `ai_draft_status`, no history of *when* it changed), and nothing at
all for routing decisions or OpenAI call cost/latency/errors.

## Decision

A single new append-only event log, `ai_events`, following the exact
dual-store pattern already established by `lib/chatStore.ts` (Supabase-first,
`globalThis`-backed in-memory fallback, demo-seeded). Three existing routes
get a one-line instrumentation call each. One new admin tab reads the feed
with a 12s auto-poll.

**Alternatives considered and rejected:**
- *Reuse existing tables only* — cheaper, but can't represent a discrete
  "AI routed lead X → category Y at 14:32" moment, and there's nowhere to
  put technical fields (latency/tokens/cost) without polluting
  `chat_sessions`/`leads`. Doesn't satisfy 3 of the 4 content types Luka asked
  for (routing decisions, technical metrics, expert-feedback *history*).
- *Full observability with trend charts* — scope creep past "a log I can
  watch"; layering charts onto `/admin/metrics` is a natural follow-up once
  this ships and has real data, not part of this spec.

## Schema

```sql
-- supabase/migrations/0008_ai_events.sql
create table if not exists public.ai_events (
  id text primary key,
  created_at timestamptz not null default now(),
  type text not null,      -- chat_reply | chat_error | match_decision | draft_rated
  ref_id text,              -- chat session id or lead id, for context
  payload jsonb not null default '{}'::jsonb
);

alter table public.ai_events enable row level security;

create index if not exists ai_events_created_idx
  on public.ai_events (created_at desc);
create index if not exists ai_events_type_idx
  on public.ai_events (type);
```

Idempotent `create table if not exists`, RLS enabled with **no policies**
(service-role key bypasses RLS — same posture as `leads`/`chat_sessions`, all
access goes through the server-side Supabase admin client, never anon/browser).

### Event types

| type | fires where | payload fields |
|---|---|---|
| `chat_reply` | every successful OpenAI chat completion | `model, latency_ms, tokens_in, tokens_out, cost_estimate, lang, phase` |
| `chat_error` | OpenAI call throws, OR the model returns an empty/unparseable reply (existing soft-fail path) | `error_kind, message, model` |
| `match_decision` | once, when a lead is captured | `category, required_skills, ai_relevant` |
| `draft_rated` | expert rates an AI brief in the Expert Portal | `rating, expert_id` |

`error_kind` reuses the classification `logChatError()` already computes:
`timeout \| connection \| rate_limit \| auth \| bad_request \| openai_5xx \| unknown`,
plus a new `empty_completion` value for the soft-fail path (which today only
`console.warn`s, no exception).

### `lib/aiEvents.ts` (new file, mirrors `lib/chatStore.ts`)

```ts
export type AiEventType = "chat_reply" | "chat_error" | "match_decision" | "draft_rated";

export interface StoredAiEvent {
  id: string;
  created_at: string;
  type: AiEventType;
  ref_id?: string;
  payload: Record<string, unknown>;
}

export async function logAiEvent(e: Omit<StoredAiEvent, "id" | "created_at">): Promise<void>
export async function listAiEvents(opts?: { type?: AiEventType; limit?: number }):
  Promise<{ events: StoredAiEvent[]; storage: "supabase" | "memory" }>
```

- `logAiEvent` is fire-and-forget and **never throws** (same contract as
  `saveChatSession`) — Supabase insert first, falls through to
  `globalThis.__ai2bAiEvents` (a plain array, not a Map — events have no
  natural upsert key) on any failure.
- In-memory array is **capped at 500 entries** (push + trim oldest) so a
  long-running dev server doesn't leak memory. No cap needed on the Supabase
  side for this MVP.
- `id` generated app-side as `evt_${crypto.randomUUID()}`, matching how
  `chat_sessions.id` is always supplied by the app (no DB default).
- Demo seeding follows the existing convention: `if (process.env.AI2B_DEMO === "1" && memoryEvents.length === 0) { ...push DEMO_AI_EVENTS }`.

### Cost estimate

Named constant, not a live lookup:

```ts
// Approximate — update if OpenAI's published gpt-4o-mini pricing changes.
const GPT_4O_MINI_PRICE_PER_1M = { input: 0.15, output: 0.60 }; // USD
```

`cost_estimate = (tokens_in / 1e6) * price.input + (tokens_out / 1e6) * price.output`.

## Instrumentation (3 call sites)

**1. `app/api/chat/route.ts`** — wrap the existing
`openai.chat.completions.create(...)` call (currently line ~199) with a
`Date.now()` timer. `completion.usage` is currently never read anywhere in
the repo (confirmed via grep) — this is the first place it gets captured.

- Capture `latencyMs` and `completion.usage` immediately after the
  `await` resolves (~line 211), but fire the actual `chat_reply` event at the
  same point `saveChatSession` is already called (~lines 246–252) — that's
  where `sessionId`/`lang`/`control.phase` all converge, so the event carries
  the resolved phase, not a pre-parse guess.
  `ref_id = isValidSessionId(body.sessionId) ? body.sessionId : undefined`.
- On the existing empty-reply soft-fail path (~lines 236–241, today only
  `console.warn`s): fire `chat_error` with `error_kind: "empty_completion"`.
- In the existing `catch` block (~line 255), alongside the existing
  `logChatError(err)` call: fire `chat_error` with the same classified
  `kind` it already computes.

**2. `app/api/lead/route.ts`** — after `saveLead(...)` resolves (line 66-79),
using the already-validated `category`/`required_skills`/`ai_relevant` from
the request body (lines 75-77): fire `match_decision` with
`ref_id = result.id`. One-shot at lead-capture time, not per chat turn —
logging on every turn would flood the feed with duplicate/partial routing
info before a lead even exists.

**3. `app/api/expert/submit/route.ts`** — immediately after the existing
`updateLeadOutcome(taskId, { ai_draft_status: rating })` call (line 88):
fire `draft_rated` with `ref_id = taskId`, `payload: { rating, expert_id: expert.id }`.

All three calls are `await`ed but wrapped so a logging failure never affects
the actual response (`logAiEvent` itself already swallows errors, per its
"never throws" contract — no extra try/catch needed at call sites, same as
existing `saveChatSession`/`markChatLeadCaptured` usage).

## Admin UI

- New tab **"AI აქტივობა"** in `AdminTabs` (extend the `active` union type,
  add `{ id: "activity", label: t.admin.tabs.activity, href: "/admin/activity" }`).
- New page `app/admin/activity/page.tsx` — server component, force-dynamic,
  cookie-gated via `isAdminRequestAuthorized()` (same pattern as
  `app/admin/chats/page.tsx`), initial fetch via `listAiEvents({ limit: 200 })`
  so there's no empty flash before the first poll lands.
- New client component `AdminActivityTable.tsx`:
  - Filter chips: All / Chat / Errors / Routing / Expert feedback
    (client-side filter over the fetched array — no server round-trip needed
    at this scale).
  - Each row: type badge, timestamp (reuse the `fmtTime` helper pattern from
    `AdminChatsTable.tsx`), and a computed one-line i18n'd summary, e.g.:
    - `chat_reply` → "AI upasuxa chat-ши (620ms, 340 tokens, ~$0.0002)"
    - `chat_error` → "AI shecdoma: rate_limit"
    - `match_decision` → "Mimarta → Design/Branding, unda: Photoshop"
    - `draft_rated` → "Eksperma miiRo AI brifi" / "...gaasworo" / "...uarhyo"
  - Technical fields (`latency_ms`/`tokens_in`/`tokens_out`/`cost_estimate`)
    shown inline for `chat_reply`/`chat_error` rows only.
  - "storage: supabase/memory" indicator pill, same convention as
    `AdminChatsTable`.
  - No deep-linking to the source lead/session in v1 (YAGNI — `ref_id` shown
    contextually in the summary text is enough; can add click-through later
    if it turns out to matter in practice).
- **Polling**: new `GET /api/admin/ai-events` route (cookie-authed via
  `isAdminRequestAuthorized()`, returns `listAiEvents()` JSON). Client
  component re-fetches every 12s via `setInterval` inside a `useEffect(...,
  [])`, merging in new rows (prepend anything with a `created_at` newer than
  the currently-held newest entry).
- i18n: new `t.admin.tabs.activity` + `t.admin.activity.*` block, ka/en, in
  `lib/i18n.ts`, following the existing `t.admin.chats.*` structure.

## Demo data

`lib/demoSeed.ts` gets a new `DEMO_AI_EVENTS: StoredAiEvent[]` array, seeded
the same way `DEMO_LEADS`/`DEMO_CHATS` are (`AI2B_DEMO=1`-gated, pushed into
the in-memory store on first read).

**Scope: 5–10 distinct simulated users/sessions**, each contributing a
different mix of event types and outcomes, so the feed reads as varied
real activity rather than a repeated template — spanning:
- multiple `chat_reply` events per session (varying `latency_ms`,
  `tokens_in`/`out`, `lang`, `phase`) tied to the existing `DEMO_CHATS`
  session ids where possible, plus a few new session ids for variety,
- at least one `chat_error` (e.g. a `rate_limit` and a `timeout` example),
- one `match_decision` per `DEMO_LEADS` entry that has a `category` set
  (reuses existing lead ids as `ref_id` — no new lead records needed),
- `draft_rated` events matching the existing `ai_draft_status` values already
  on `DEMO_LEADS` (accepted/edited/rejected), so the log's history is
  consistent with the current-state field already shown elsewhere.

Timestamps follow the existing `2026-07-1x` fixed-date convention used by
the rest of `demoSeed.ts`.

## Out of scope (this spec)

- Pre-send human-in-the-loop gating (admin approving AI output before it
  reaches an expert/client) — explicitly declined in brainstorming; this is
  a passive log, not a blocking gate.
- Client-side (business portal) access to any AI tool — raised then withdrawn
  by Luka during brainstorming ("არაფერი, ეს მგონი სისულელე ვთქვი").
- Charts/trends over the event data, cost dashboards, retention/cleanup jobs
  for the Supabase table, deep-linking from a feed row to its source
  lead/session.
