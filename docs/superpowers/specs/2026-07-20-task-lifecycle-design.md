# Task Lifecycle Wave — Design Spec

**Date:** 2026-07-20
**Status:** Approved (brainstorm) — ready for implementation plan
**Branch:** continues on top of `feat/ai-activity-log` (all three prior branches now merged to `main`; a new branch `feat/task-lifecycle` will stack on current `main`)

## Problem

A code-level audit of the three portals found the operational fields that make
real work flow are missing:

- **Experts** can't see what a task pays (the 70/30 split exists only in pitch
  documents, nowhere in code) and no deadline exists anywhere in the system.
- **Clients** see "in progress" with no expected delivery date, and can't
  respond to delivered work at all — no accept, no revision request. That
  contradicts the locked "relationships + quality" strategy.
- **Admin** can't set deadlines and never sees the expert/platform revenue
  split.
- The platform's **four AI roles** (consultant, brief author, router, file
  reader) are unlabeled — internally indistinguishable. Per the locked
  Lawhive/AI-invisible strategy, they get surfaced **internally only**
  (admin + expert views), never client-facing.

## Decision

One migration + one config constant + extended store projections + three new
API routes + UI additions in all three portals + one metrics tile + i18n
relabels. No new tables, no email infra, no realtime.

### 1. Schema — `supabase/migrations/0009_task_lifecycle.sql`

```sql
alter table public.leads add column if not exists due_at timestamptz;
alter table public.leads add column if not exists revision_note text;
alter table public.leads add column if not exists revision_requested_at timestamptz;
alter table public.leads add column if not exists client_accepted boolean not null default false;
```

Idempotent `alter table ... if not exists`, matching the 0003/0004 idiom.

### 2. Payout — computed, never stored

`lib/config.ts` gains `EXPERT_SHARE = 0.70` (fixed for all experts — Luka's
decision 2026-07-20; per-expert splits explicitly rejected for v1).
`expert_payout = Math.round(amount * EXPERT_SHARE)`, computed server-side in
the `toExpertTask` projection. The expert sees ONLY their own payout number,
not the full deal amount.

### 3. Store layer — `lib/leadStore.ts`

- `Lead`/`StoredLead` gain `due_at?`, `revision_note?`,
  `revision_requested_at?`, `client_accepted?`.
- `ExpertTask` gains `due_at?`, `expert_payout?`, `revision_note?`,
  `revision_requested_at?` (projection computes payout; client PII still
  stripped).
- `ClientRequest` gains `due_at?`, `client_accepted?`, `revision_note?`,
  `revision_requested_at?`.
- Three new dual-store write functions (Supabase-first + memory fallback,
  same pattern as `updateLeadStatus`):
  - `updateLeadDue(id, due_at: string | null)` — admin sets/clears deadline.
  - `requestLeadRevision(id, note)` — sets `revision_note`,
    `revision_requested_at = now`, `status = "in_progress"`,
    `client_accepted = false`.
  - `acceptLeadWork(id)` — sets `client_accepted = true` (status stays
    `done`).

**Revision-state UI rule (single source of truth):** revision UI (orange
blocks/badges) renders only while `status === "in_progress" AND revision_note`
is set. When the expert re-submits (existing flow flips status back to
`done`), the badges disappear automatically — the note is kept in the DB but
no longer shown as active. No clearing logic needed, no revision history in
v1 (a second request overwrites the note).

### 4. API routes

- `POST /api/client/accept` — body `{id}`. Auth via `getAuthedClient()`;
  ownership = the id must be in the authed client's own requests; guard:
  only when `status === "done"`. Calls `acceptLeadWork`. Rate-limited.
- `POST /api/client/revision` — body `{id, note}` (note required, clamped
  to 2000 chars). Same auth/ownership; guard: only when `status === "done"`.
  Calls `requestLeadRevision`. Rate-limited.
- `POST /api/admin/due` — body `{id, due_at}` (ISO string or null to
  clear). `isAdminRequestAuthorized()` gate, mirrors `/api/admin/amount`.

### 5. Expert portal UI

- Payout line on task cards/detail: "ანაზღაურება: 840₾" (only when
  `expert_payout > 0`).
- Due date shown; red "ვადაგადაცილებული" badge when
  `due_at < now && status !== "done"`.
- Orange revision block at the top of the task detail (client's note,
  full text) when the revision-state rule is active.
- Brief section header relabeled to name the AI role: "AI ბრიფის ავტორი".

### 6. Client portal UI

- "სავარაუდო ჩაბარება: <date>" line when `due_at` set.
- On ANY `done` task with `!client_accepted` (deliverables optional — work
  may have been delivered off-platform): two actions —
  **"ვადასტურებ ✓"** → `client_accepted = true`, green "მიღებულია ✓" badge,
  actions disappear; **"შესწორება მინდა"** → textarea → POST → status back
  to in-progress, small "შესწორება მოთხოვნილია" note shown while active.
- `router.refresh()` after either action (server component re-fetches).

### 7. Admin UI + metrics + AI role labels

- Assignment panel: date input for the deadline (POSTs `/api/admin/due`);
  payout hint next to the amount field ("ექსპერტის წილი: 840₾ · 70%").
- Lead rows/detail: overdue badge, "შესწორება მოთხოვნილია" badge,
  "კლიენტმა მიიღო ✓" badge.
- Metrics: one new tile pair on collected (paid) revenue —
  `expertShare = round(collected × 0.70)`, `platformShare = collected −
  expertShare`.
- AI Activity tab: type badges renamed to role names — "AI კონსულტანტი"
  (chat_reply), "AI როუტერი" (match_decision), "AI ბრიფი — ექსპერტის
  შეფასება" (draft_rated), "AI შეცდომა" unchanged — plus a one-line legend
  under the header naming all four roles (consultant / brief author /
  router / file reader).

### 8. Demo seed

- `demo-1` (done/paid/won): `client_accepted = true`, met deadline.
- `demo-4` (in_progress): `due_at` in the past (overdue badge) AND an
  active `revision_note` — the richest demo card.
- `demo-5` (new): future `due_at`.
- `DEMO_AI_EVENTS` unchanged.

## Out of scope (this wave)

Email notifications (Resend — deferred by Luka), per-expert split
percentages, revision history (only the latest note is kept), an expert
payout ledger/settlement tracking beyond the metrics tile, any client-facing
AI labeling (strategy: AI stays invisible to clients), landing-page
"AI executes simple tasks itself" promise (raised, explicitly not chosen).

## Verification convention

No test runner exists in this repo — verification is `npx tsc --noEmit`,
`next build`, curl against the `AI2B_DEMO=1` server on :3550 (including
negative cases: foreign-id ownership 403/404, guard rejections), and a
browser walkthrough of all three portals.
