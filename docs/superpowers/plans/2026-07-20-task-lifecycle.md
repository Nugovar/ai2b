# Task Lifecycle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expert payout display (fixed 70% share), admin-set deadlines with overdue badges, a client accept/revision cycle on delivered work, an expert/platform revenue-split metric, and internal AI-role labels.

**Architecture:** One additive migration (`0009`) + one config constant (`EXPERT_SHARE`) + extended `leadStore` projections and three new dual-store writers + three new API routes (mirroring existing admin/client route idioms) + UI additions in all three portals + one metrics extension. No new tables, no email, no realtime.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase (Postgres). No test framework exists in this repo — verification is `npx tsc --noEmit` + curl against the `AI2B_DEMO=1` dev server on :3550 + browser walkthrough, per established convention.

**Spec:** `docs/superpowers/specs/2026-07-20-task-lifecycle-design.md`
**Branch:** `feat/task-lifecycle` (already created off merged `main`; spec already committed).

**Before starting:** ensure the demo dev server runs (never touches real data):
```bash
cd /Users/lukagvenetadze/Building/AI2B
AI2B_DEMO=1 npm run dev -- --port 3550
```
⚠️ Never run `npm run build` while the dev server is live (corrupts shared `.next`). Stop it first (Task 8 does).
⚠️ Demo-seed changes (Task 2) need a dev-server RESTART to take effect — the in-memory store seeds once per process (`globalThis`-guarded), so a running server keeps the old seed after HMR.

---

### Task 1: Migration 0009 + `EXPERT_SHARE` constant

**Files:**
- Create: `supabase/migrations/0009_task_lifecycle.sql`
- Modify: `lib/config.ts`

- [ ] **Step 1: Write the migration**

```sql
-- Task lifecycle: admin-set deadlines + the client accept/revision cycle.
-- Expert payout is NOT stored — always computed as amount * EXPERT_SHARE
-- (lib/config.ts). Idempotent; run after 0008_ai_events.sql.
alter table public.leads add column if not exists due_at timestamptz;
alter table public.leads add column if not exists revision_note text;
alter table public.leads add column if not exists revision_requested_at timestamptz;
alter table public.leads add column if not exists client_accepted boolean not null default false;
```

- [ ] **Step 2: Append the constant to `lib/config.ts`**

Add at the end of the file:

```ts

// EXPERT_SHARE — the fixed fraction of a deal amount paid out to the expert
// (the ~70/30 platform split from the project docs; fixed for ALL experts —
// Luka's decision 2026-07-20, per-expert splits rejected for v1). The payout
// is always computed (Math.round(amount * EXPERT_SHARE)), never stored.
export const EXPERT_SHARE = 0.7;
```

- [ ] **Step 3: Verify + commit**

```bash
cd /Users/lukagvenetadze/Building/AI2B
npx tsc --noEmit
git add supabase/migrations/0009_task_lifecycle.sql lib/config.ts
git commit -m "Task lifecycle: migration + EXPERT_SHARE constant"
```
Expected: tsc clean.

---

### Task 2: Store layer — types, projections, writers, demo seed

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/leadStore.ts`
- Modify: `lib/demoSeed.ts`

- [ ] **Step 1: Extend `Lead` in `lib/types.ts`**

Find the end of the `Lead` interface (the `ai_draft_status` field is currently the last one):
```ts
  ai_draft_status?: AiDraftStatus;
}
```
Replace with:
```ts
  ai_draft_status?: AiDraftStatus;
  // Task lifecycle: admin-set deadline + the client accept/revision cycle.
  due_at?: string; // ISO timestamptz
  revision_note?: string; // client's latest change request (only the latest is kept)
  revision_requested_at?: string;
  client_accepted?: boolean; // client confirmed the delivered work
}
```

- [ ] **Step 2: Extend `ExpertTask` + `toExpertTask` in `lib/leadStore.ts`**

Add the import at the top, after the existing `demoSeed` import:
```ts
import { DEMO_LEADS } from "@/lib/demoSeed";
```
becomes:
```ts
import { DEMO_LEADS } from "@/lib/demoSeed";
import { EXPERT_SHARE } from "@/lib/config";
```

In the `ExpertTask` interface, find:
```ts
  deliverables?: Attachment[]; // the expert's own uploaded work
  ai_draft_status?: AiDraftStatus; // current rating (so the UI reflects state)
}
```
Replace with:
```ts
  deliverables?: Attachment[]; // the expert's own uploaded work
  ai_draft_status?: AiDraftStatus; // current rating (so the UI reflects state)
  due_at?: string; // admin-set deadline
  expert_payout?: number; // GEL — computed share, the ONLY money figure an expert sees
  revision_note?: string; // client's change request (active while in_progress)
  revision_requested_at?: string;
}
```

In `toExpertTask`, find:
```ts
    deliverables: l.deliverables,
    ai_draft_status: l.ai_draft_status,
  };
}
```
Replace with:
```ts
    deliverables: l.deliverables,
    ai_draft_status: l.ai_draft_status,
    due_at: l.due_at,
    // The expert sees only THEIR payout — never the full deal amount.
    expert_payout:
      Number.isFinite(l.amount) && Number(l.amount) > 0
        ? Math.round(Number(l.amount) * EXPERT_SHARE)
        : undefined,
    revision_note: l.revision_note,
    revision_requested_at: l.revision_requested_at,
  };
}
```

- [ ] **Step 3: Extend `ClientRequest` + `toClientRequest`**

In the `ClientRequest` interface, find:
```ts
  amount?: number;
  deliverables?: Attachment[];
}
```
Replace with:
```ts
  amount?: number;
  deliverables?: Attachment[];
  due_at?: string;
  client_accepted?: boolean;
  revision_note?: string;
  revision_requested_at?: string;
}
```

In `toClientRequest`, find:
```ts
    amount: l.amount,
    deliverables: l.deliverables,
  };
}
```
Replace with:
```ts
    amount: l.amount,
    deliverables: l.deliverables,
    due_at: l.due_at,
    client_accepted: l.client_accepted,
    revision_note: l.revision_note,
    revision_requested_at: l.revision_requested_at,
  };
}
```

- [ ] **Step 4: Add the three writers at the end of `lib/leadStore.ts`**

Append after `updatePaymentStatus` (the current last function):

```ts

// Set or clear a lead's deadline (admin). Returns true on success.
export async function updateLeadDue(id: string, due_at: string | null): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update({ due_at }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE updating due date. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.due_at = due_at ?? undefined;
    return true;
  }
  return false;
}

// Client requests changes on delivered work: store the note, reopen the task
// (status -> in_progress), clear acceptance. Only the latest note is kept —
// a second request overwrites it (v1: no revision history).
export async function requestLeadRevision(id: string, note: string): Promise<boolean> {
  const now = new Date().toISOString();
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin
        .from("leads")
        .update({
          revision_note: note,
          revision_requested_at: now,
          status: "in_progress",
          client_accepted: false,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE requesting revision. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.revision_note = note;
    lead.revision_requested_at = now;
    lead.status = "in_progress";
    lead.client_accepted = false;
    return true;
  }
  return false;
}

// Client confirms the delivered work. Status stays "done".
export async function acceptLeadWork(id: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseServerConfigured) {
    try {
      const { error } = await admin.from("leads").update({ client_accepted: true }).eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    } catch (e) {
      console.error(
        "[leadStore] DB UNREACHABLE accepting work. reason:",
        e instanceof Error ? e.message : String(e)
      );
      return false;
    }
  }
  const lead = memoryLeads.find((l) => l.id === id);
  if (lead) {
    lead.client_accepted = true;
    return true;
  }
  return false;
}
```

- [ ] **Step 5: Demo seed — lifecycle fields on three leads (`lib/demoSeed.ts`)**

In `demo-1` (ნინი ბერიძე), find:
```ts
    payment_status: "paid",
    amount: 1200,
    outcome: "won",
    ai_draft_status: "accepted",
```
Replace with:
```ts
    payment_status: "paid",
    amount: 1200,
    outcome: "won",
    ai_draft_status: "accepted",
    due_at: "2026-07-16T18:00:00.000Z",
    client_accepted: true,
```

In `demo-4` (დავით ლომიძე), find:
```ts
    payment_status: "unpaid",
    amount: 750,
    outcome: "pending",
    ai_draft_status: "unset",
  },
```
Replace with:
```ts
    payment_status: "unpaid",
    amount: 750,
    outcome: "pending",
    ai_draft_status: "unset",
    due_at: "2026-07-18T18:00:00.000Z",
    revision_note:
      "ლოგო ძალიან ღია ფერებშია — უფრო მუქი, ბუნებრივი მწვანე გვინდა. სავიზიტოზე ტელეფონის ნომერიც შეცვალეთ: 577 30 99 15.",
    revision_requested_at: "2026-07-19T10:15:00.000Z",
  },
```
(demo-4 is `in_progress` with a past `due_at` → shows BOTH the overdue badge and the active revision block — the richest demo card. It belongs to `seed-tamar`, the demo expert login.)

In `demo-5` (მარიამ ჩხაიძე), find:
```ts
    payment_status: "unpaid",
    amount: 0,
    outcome: "pending",
    ai_draft_status: "unset",
  },
```
Replace with:
```ts
    payment_status: "unpaid",
    amount: 0,
    outcome: "pending",
    ai_draft_status: "unset",
    due_at: "2026-07-25T18:00:00.000Z",
  },
```
⚠️ demo-5 and demo-4 have identical `payment_status/amount/outcome/ai_draft_status` blocks — demo-4's block is distinguished by `amount: 750` vs demo-5's `amount: 0`, so the find-strings above are unique. Verify you edited the right lead by the surrounding `id:` field.

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit
git add lib/types.ts lib/leadStore.ts lib/demoSeed.ts
git commit -m "Task lifecycle: types, projections, writers, demo seed"
```
Expected: tsc clean.

---

### Task 3: API routes — admin due, client accept, client revision

**Files:**
- Create: `app/api/admin/due/route.ts`
- Create: `app/api/client/accept/route.ts`
- Create: `app/api/client/revision/route.ts`

- [ ] **Step 1: `app/api/admin/due/route.ts`** (mirrors `app/api/admin/amount/route.ts`)

```ts
// Set or clear a lead's deadline. Admin-only (cookie-authed).
import { NextRequest, NextResponse } from "next/server";
import { updateLeadDue } from "@/lib/leadStore";
import { isAdminRequestAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequestAuthorized()) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { id?: string; due_at?: string | null };
    if (typeof body.id !== "string" || !body.id) {
      return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
    }
    let due: string | null = null;
    if (typeof body.due_at === "string" && body.due_at) {
      const d = new Date(body.due_at);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "bad date" }, { status: 400 });
      }
      due = d.toISOString();
    }

    const ok = await updateLeadDue(body.id, due);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    console.error("[api/admin/due] error:", err);
    return NextResponse.json({ ok: false, error: "server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: `app/api/client/accept/route.ts`** (auth idiom from `app/api/client/login/route.ts` + `getAuthedClient`)

```ts
// Client confirms delivered work. Cookie-authed; the id must be one of the
// authed client's OWN requests (ownership) and the task must be done.
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/clientAuth";
import { acceptLeadWork } from "@/lib/leadStore";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`client-accept:${ip}`, 20, 60_000); // 20 / min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = typeof body.id === "string" ? body.id : "";
  const request = client.requests.find((r) => r.id === id);
  if (!request) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (request.status !== "done") {
    return NextResponse.json({ ok: false, error: "not_done" }, { status: 400 });
  }

  const ok = await acceptLeadWork(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
```

- [ ] **Step 3: `app/api/client/revision/route.ts`**

```ts
// Client requests changes on delivered work. Cookie-authed + ownership-checked;
// reopens the task (status -> in_progress) with the client's note.
import { NextRequest, NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/clientAuth";
import { requestLeadRevision } from "@/lib/leadStore";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`client-revision:${ip}`, 10, 60_000); // 10 / min
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const client = await getAuthedClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; note?: string };
  const id = typeof body.id === "string" ? body.id : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (!note) {
    return NextResponse.json({ ok: false, error: "note_required" }, { status: 400 });
  }
  const request = client.requests.find((r) => r.id === id);
  if (!request) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (request.status !== "done") {
    return NextResponse.json({ ok: false, error: "not_done" }, { status: 400 });
  }

  const ok = await requestLeadRevision(id, note);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
```

- [ ] **Step 4: Verify end-to-end with curl (demo server on :3550 — RESTART it first so Task 2's seed loads)**

```bash
cd /Users/lukagvenetadze/Building/AI2B
npx tsc --noEmit
```
Restart the demo server (kill the :3550 process, start `AI2B_DEMO=1 npm run dev -- --port 3550`), then:

```bash
# 1. Admin sets a deadline on demo-5 (demo mode: admin auth open)
curl -s -X POST http://localhost:3550/api/admin/due \
  -H "Content-Type: application/json" \
  -d '{"id":"demo-5","due_at":"2026-07-30"}'
# expect {"ok":true}

# 2. Bad date rejected
curl -s -X POST http://localhost:3550/api/admin/due \
  -H "Content-Type: application/json" -d '{"id":"demo-5","due_at":"not-a-date"}'
# expect {"ok":false,"error":"bad date"}

# 3. Unauthenticated client accept -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3550/api/client/accept \
  -H "Content-Type: application/json" -d '{"id":"demo-3"}'
# expect 401

# 4. Login as ana (owns demo-3, status done)
curl -s -c /tmp/ana-cookie.txt -X POST http://localhost:3550/api/client/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@lumebeauty.ge","phone":"598 44 22 10"}'
# expect {"ok":true}

# 5. Foreign id -> 403 (demo-1 belongs to nini, not ana)
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/ana-cookie.txt -X POST http://localhost:3550/api/client/accept \
  -H "Content-Type: application/json" -d '{"id":"demo-1"}'
# expect 403

# 6. Accept own done task -> ok
curl -s -b /tmp/ana-cookie.txt -X POST http://localhost:3550/api/client/accept \
  -H "Content-Type: application/json" -d '{"id":"demo-3"}'
# expect {"ok":true}

# 7. Revision with empty note -> 400
curl -s -b /tmp/ana-cookie.txt -X POST http://localhost:3550/api/client/revision \
  -H "Content-Type: application/json" -d '{"id":"demo-3","note":"  "}'
# expect {"ok":false,"error":"note_required"}

# 8. Revision on own done task -> ok (reopens it)
curl -s -b /tmp/ana-cookie.txt -X POST http://localhost:3550/api/client/revision \
  -H "Content-Type: application/json" \
  -d '{"id":"demo-3","note":"ილუსტრაციები უფრო თბილ ტონებში გადააკეთეთ"}'
# expect {"ok":true}

# 9. Accept now fails: status went back to in_progress
curl -s http://localhost:3550/api/client/accept -X POST -b /tmp/ana-cookie.txt \
  -H "Content-Type: application/json" -d '{"id":"demo-3"}'
# expect {"ok":false,"error":"not_done"}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/due/route.ts app/api/client/accept/route.ts app/api/client/revision/route.ts
git commit -m "Task lifecycle: due/accept/revision API routes"
```

---

### Task 4: i18n — all three dictionaries

**Files:**
- Modify: `lib/expertI18n.ts`
- Modify: `lib/clientI18n.ts`
- Modify: `lib/i18n.ts`

- [ ] **Step 1: `lib/expertI18n.ts`**

In the `ExpertDict` interface, find:
```ts
  statusNew: string;
  statusInProgress: string;
  statusDone: string;
}
```
Replace with:
```ts
  statusNew: string;
  statusInProgress: string;
  statusDone: string;
  // Lifecycle
  briefAuthorTitle: string; // AI-role label for the brief section header
  payoutLabel: string;
  dueLabel: string;
  overdue: string;
  revisionTitle: string;
}
```

In the `ka` object, find:
```ts
  statusNew: "ახალი",
  statusInProgress: "მიმდინარე",
  statusDone: "დასრულებული",
};
```
Replace with:
```ts
  statusNew: "ახალი",
  statusInProgress: "მიმდინარე",
  statusDone: "დასრულებული",
  briefAuthorTitle: "AI ბრიფის ავტორი",
  payoutLabel: "ანაზღაურება",
  dueLabel: "ჩაბარების ვადა",
  overdue: "ვადაგადაცილებული",
  revisionTitle: "კლიენტმა შესწორება მოითხოვა",
};
```

In the `en` object, find:
```ts
  statusNew: "New",
  statusInProgress: "In progress",
  statusDone: "Done",
};
```
Replace with:
```ts
  statusNew: "New",
  statusInProgress: "In progress",
  statusDone: "Done",
  briefAuthorTitle: "AI brief author",
  payoutLabel: "Your payout",
  dueLabel: "Due",
  overdue: "Overdue",
  revisionTitle: "The client requested changes",
};
```
(`briefTitle` stays unchanged — it's still used as the label in the done-state recap line, where "AI ბრიფი: შევასწორე" reads correctly.)

- [ ] **Step 2: `lib/clientI18n.ts`**

In the `ClientDict` interface, find:
```ts
  view: string;
  hide: string;
}
```
Replace with:
```ts
  view: string;
  hide: string;
  // Lifecycle
  dueLabel: string;
  acceptBtn: string;
  accepted: string;
  reviseBtn: string;
  revisePlaceholder: string;
  reviseSend: string;
  reviseCancel: string;
  revisionPending: string;
  actionError: string;
}
```

In the `ka` object, find:
```ts
  view: "ნახვა",
  hide: "დახურვა",
};
```
Replace with:
```ts
  view: "ნახვა",
  hide: "დახურვა",
  dueLabel: "სავარაუდო ჩაბარება",
  acceptBtn: "ვადასტურებ ✓",
  accepted: "მიღებულია ✓",
  reviseBtn: "შესწორება მინდა",
  revisePlaceholder: "აღწერე რა შესაცვლელია...",
  reviseSend: "გაგზავნა",
  reviseCancel: "გაუქმება",
  revisionPending: "შესწორება მოთხოვნილია — ექსპერტი მუშაობს",
  actionError: "ვერ შესრულდა. სცადე ხელახლა.",
};
```

In the `en` object, find:
```ts
  view: "View",
  hide: "Hide",
};
```
Replace with:
```ts
  view: "View",
  hide: "Hide",
  dueLabel: "Expected delivery",
  acceptBtn: "Accept ✓",
  accepted: "Accepted ✓",
  reviseBtn: "Request changes",
  revisePlaceholder: "Describe what needs to change...",
  reviseSend: "Send",
  reviseCancel: "Cancel",
  revisionPending: "Changes requested — the expert is on it",
  actionError: "Something went wrong. Please try again.",
};
```

- [ ] **Step 3: `lib/i18n.ts` — AdminDict interface**

3a. In the `AdminDict` interface, find the `activity` block's closing lines:
```ts
    category: string;
    skills: string;
    expert: string;
  };
```
Replace with:
```ts
    category: string;
    skills: string;
    expert: string;
    rolesLegend: string;
  };
  lifecycle: {
    due: string;
    overdue: string;
    revisionRequested: string;
    clientAccepted: string;
    expertShare: string;
  };
```

3b. In the interface's `metrics` block, find:
```ts
    kpiAcceptance: string; acceptanceHint: string; kpiWinRate: string;
    outcomeTitle: string; aiDraftTitle: string; rated: string;
  };
```
Replace with:
```ts
    kpiAcceptance: string; acceptanceHint: string; kpiWinRate: string;
    outcomeTitle: string; aiDraftTitle: string; rated: string;
    kpiExpertShare: string; kpiPlatformShare: string;
  };
```

- [ ] **Step 4: `lib/i18n.ts` — `ka` values**

4a. AI-role relabels — in the `ka` `activity` block, find:
```ts
      typeChatReply: "AI პასუხი",
      typeChatError: "AI შეცდომა",
      typeMatchDecision: "როუთინგის გადაწყვეტილება",
      typeDraftRated: "ბრიფის შეფასება",
```
Replace with:
```ts
      typeChatReply: "AI კონსულტანტი",
      typeChatError: "AI შეცდომა",
      typeMatchDecision: "AI როუტერი",
      typeDraftRated: "AI ბრიფი — ექსპერტის შეფასება",
```

4b. In the same `ka` `activity` block, find:
```ts
      category: "კატეგორია",
      skills: "საჭირო უნარები",
      expert: "ექსპერტი",
    },
```
Replace with:
```ts
      category: "კატეგორია",
      skills: "საჭირო უნარები",
      expert: "ექსპერტი",
      rolesLegend:
        "AI როლები: კონსულტანტი (ჩატი) · ბრიფის ავტორი · როუტერი · ფაილების წამკითხველი",
    },
    lifecycle: {
      due: "ვადა",
      overdue: "ვადაგადაცილებული",
      revisionRequested: "შესწორება მოთხოვნილია",
      clientAccepted: "კლიენტმა მიიღო ✓",
      expertShare: "ექსპერტის წილი",
    },
```

4c. In the `ka` `metrics` block, find:
```ts
      outcomeTitle: "შედეგები",
      aiDraftTitle: "AI-ბრიფის ხარისხი",
      rated: "შეფასებული",
    },
```
Replace with:
```ts
      outcomeTitle: "შედეგები",
      aiDraftTitle: "AI-ბრიფის ხარისხი",
      rated: "შეფასებული",
      kpiExpertShare: "ექსპერტების წილი (70%)",
      kpiPlatformShare: "პლატფორმის წილი (30%)",
    },
```

- [ ] **Step 5: `lib/i18n.ts` — `en` values**

5a. In the `en` `activity` block, find:
```ts
      typeChatReply: "AI reply",
      typeChatError: "AI error",
      typeMatchDecision: "Routing decision",
      typeDraftRated: "Draft rated",
```
Replace with:
```ts
      typeChatReply: "AI consultant",
      typeChatError: "AI error",
      typeMatchDecision: "AI router",
      typeDraftRated: "AI brief — expert rating",
```

5b. In the same `en` `activity` block, find:
```ts
      category: "Category",
      skills: "Required skills",
      expert: "Expert",
    },
```
Replace with:
```ts
      category: "Category",
      skills: "Required skills",
      expert: "Expert",
      rolesLegend: "AI roles: consultant (chat) · brief author · router · file reader",
    },
    lifecycle: {
      due: "Due",
      overdue: "Overdue",
      revisionRequested: "Revision requested",
      clientAccepted: "Client accepted ✓",
      expertShare: "Expert share",
    },
```

5c. In the `en` `metrics` block, find:
```ts
      outcomeTitle: "Outcomes",
      aiDraftTitle: "AI-draft quality",
      rated: "rated",
    },
```
Replace with:
```ts
      outcomeTitle: "Outcomes",
      aiDraftTitle: "AI-draft quality",
      rated: "rated",
      kpiExpertShare: "Expert share (70%)",
      kpiPlatformShare: "Platform share (30%)",
    },
```

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit
git add lib/expertI18n.ts lib/clientI18n.ts lib/i18n.ts
git commit -m "Task lifecycle: ka/en strings + AI role labels"
```
Expected: tsc clean (interface + both language literals must agree in all three dicts).

---

### Task 5: Expert portal UI

**Files:**
- Modify: `components/ExpertPortal.tsx`

- [ ] **Step 1: Module-level helpers**

After the existing `StatusPill` function (ends `}` before `export default function ExpertPortal`), insert:

```tsx
function fmtDue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isOverdue(t: { due_at?: string; status: string }): boolean {
  return (
    Boolean(t.due_at) && t.status !== "done" && new Date(t.due_at as string).getTime() < Date.now()
  );
}
```

- [ ] **Step 2: Feed card — overdue/revision badges + payout line**

In the `Feed` function, find:
```tsx
                  {task.ai_relevant && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">
                      {T.aiFlag}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {task.summary || task.advice || "—"}
                </p>
```
Replace with:
```tsx
                  {task.ai_relevant && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-red">
                      {T.aiFlag}
                    </span>
                  )}
                  {isOverdue(task) && (
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-brand-red">
                      {T.overdue}
                    </span>
                  )}
                  {task.status === "in_progress" && task.revision_note && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      🔁 {T.revisionTitle}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {task.summary || task.advice || "—"}
                </p>
                {typeof task.expert_payout === "number" && task.expert_payout > 0 && (
                  <p className="mt-1 text-xs font-semibold text-brand-dark">
                    {T.payoutLabel}: {task.expert_payout}₾
                  </p>
                )}
```

- [ ] **Step 3: Detail — payout + due strip in the task-header card**

In the `Detail` function, find the end of the task-header card:
```tsx
        {task.category && task.business_type && (
          <p className="mt-1 text-sm text-gray-400">{task.category}</p>
        )}
      </div>
```
Replace with:
```tsx
        {task.category && task.business_type && (
          <p className="mt-1 text-sm text-gray-400">{task.category}</p>
        )}
        {(Boolean(task.expert_payout) || Boolean(task.due_at)) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-100 pt-3 text-sm">
            {typeof task.expert_payout === "number" && task.expert_payout > 0 && (
              <span className="text-gray-500">
                {T.payoutLabel}:{" "}
                <span className="font-bold text-brand-dark">{task.expert_payout}₾</span>
              </span>
            )}
            {task.due_at && (
              <span className="text-gray-500">
                {T.dueLabel}:{" "}
                <span className="font-semibold text-brand-dark">{fmtDue(task.due_at)}</span>
                {isOverdue(task) && (
                  <span className="ml-2 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-brand-red">
                    {T.overdue}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Detail — revision block + brief header relabel**

Find (immediately after the task-header card's closing `</div>` from Step 3, this is the AI-brief section):
```tsx
      {/* AI brief */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          {T.briefTitle}
        </h3>
```
Replace with:
```tsx
      {/* Client revision request — active only while the task is reopened. */}
      {task.status === "in_progress" && task.revision_note && (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
            🔁 {T.revisionTitle}
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">
            {task.revision_note}
          </p>
        </section>
      )}

      {/* AI brief */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          {T.briefAuthorTitle}
        </h3>
```
(The done-state recap further down still uses `{T.briefTitle}:` — leave it unchanged.)

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit
curl -s http://localhost:3550/expert | grep -o "ექსპერტის პორტალი" | head -1
```
Expected: tsc clean; the portal login page still renders. Full visual check happens in Task 8 (the portal needs a login session, easier in the browser).

```bash
git add components/ExpertPortal.tsx
git commit -m "Task lifecycle: expert portal — payout, deadline, revision block"
```

---

### Task 6: Client portal UI

**Files:**
- Modify: `components/ClientPortal.tsx`

- [ ] **Step 1: Action state + handlers**

Find:
```tsx
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(requests[0]?.id ?? null);
```
Replace with:
```tsx
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(requests[0]?.id ?? null);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(false);

  async function accept(id: string) {
    if (busy) return;
    setBusy(true);
    setActionError(false);
    try {
      const res = await fetch("/api/client/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setActionError(true);
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setActionError(true);
      setBusy(false);
    }
  }

  async function sendRevision(id: string) {
    if (busy || !note.trim()) return;
    setBusy(true);
    setActionError(false);
    try {
      const res = await fetch("/api/client/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, note: note.trim() }),
      });
      if (!res.ok) {
        setActionError(true);
        setBusy(false);
        return;
      }
      setReviseId(null);
      setNote("");
      router.refresh();
      setBusy(false);
    } catch {
      setActionError(true);
      setBusy(false);
    }
  }
```

- [ ] **Step 2: "Accepted" badge in the card header**

Find (the badges row inside the card header button):
```tsx
                    <div className="flex flex-wrap items-center gap-2">
                      {r.payment_status === "paid" ? (
```
Replace with:
```tsx
                    <div className="flex flex-wrap items-center gap-2">
                      {r.client_accepted && (
                        <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          {T.accepted}
                        </span>
                      )}
                      {r.payment_status === "paid" ? (
```

- [ ] **Step 3: Due date + revision-pending note in the expanded detail**

Find:
```tsx
                      {r.status === "in_progress" && r.expert_assigned && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          ⚙️ {T.expertOnIt}
                        </p>
                      )}
```
Replace with:
```tsx
                      {r.status === "in_progress" && r.revision_note ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          🔁 {T.revisionPending}
                        </p>
                      ) : (
                        r.status === "in_progress" &&
                        r.expert_assigned && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            ⚙️ {T.expertOnIt}
                          </p>
                        )
                      )}

                      {r.due_at && (
                        <p className="text-sm text-gray-600">
                          {T.dueLabel}:{" "}
                          <span className="font-semibold text-brand-dark">{fmtDate(r.due_at)}</span>
                        </p>
                      )}
```

- [ ] **Step 4: Accept / revision actions after the deliverables block**

Find (the deliverables block's closing + the expanded-section close):
```tsx
                      {deliverables.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-green-600">
                            {T.deliverablesTitle}
                          </h4>
                          <ul className="space-y-1.5">
                            {deliverables.map((f, i) => (
                              <li key={i}>
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-green-700 hover:underline"
                                >
                                  <span aria-hidden>{f.isImage ? "🖼️" : "📄"}</span>
                                  <span className="truncate">{f.name}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
```
Replace with:
```tsx
                      {deliverables.length > 0 && (
                        <div>
                          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-green-600">
                            {T.deliverablesTitle}
                          </h4>
                          <ul className="space-y-1.5">
                            {deliverables.map((f, i) => (
                              <li key={i}>
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-green-700 hover:underline"
                                >
                                  <span aria-hidden>{f.isImage ? "🖼️" : "📄"}</span>
                                  <span className="truncate">{f.name}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Accept / request-changes — any delivered (done) task the
                          client hasn't confirmed yet. Deliverables optional (work
                          may have been handed off outside the platform). */}
                      {r.status === "done" && !r.client_accepted && (
                        <div className="border-t border-gray-100 pt-4">
                          {reviseId === r.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={T.revisePlaceholder}
                                rows={3}
                                maxLength={2000}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-brand-dark outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => sendRevision(r.id)}
                                  disabled={busy || !note.trim()}
                                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                >
                                  {busy ? "..." : T.reviseSend}
                                </button>
                                <button
                                  onClick={() => {
                                    setReviseId(null);
                                    setNote("");
                                  }}
                                  disabled={busy}
                                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-400"
                                >
                                  {T.reviseCancel}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => accept(r.id)}
                                disabled={busy}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                {T.acceptBtn}
                              </button>
                              <button
                                onClick={() => {
                                  setReviseId(r.id);
                                  setNote("");
                                }}
                                disabled={busy}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-red hover:text-brand-red"
                              >
                                {T.reviseBtn}
                              </button>
                            </div>
                          )}
                          {actionError && (
                            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-brand-red">
                              {T.actionError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
```

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit
git add components/ClientPortal.tsx
git commit -m "Task lifecycle: client portal — ETA, accept, revision request"
```
Expected: tsc clean. Interactive verification happens in Task 8's browser walkthrough.

---

### Task 7: Admin UI — due picker, payout hint, badges, metrics tiles, AI legend

**Files:**
- Modify: `components/AdminLeadsTable.tsx`
- Modify: `lib/metrics.ts`
- Modify: `components/AdminMetrics.tsx`
- Modify: `components/AdminActivityTable.tsx`

- [ ] **Step 1: `AdminLeadsTable.tsx` — import + handler + prop threading**

1a. Find:
```tsx
import { translit } from "@/lib/translit";
```
Replace with:
```tsx
import { translit } from "@/lib/translit";
import { EXPERT_SHARE } from "@/lib/config";
```

1b. After the existing `changeAmount` function (ends with the `}` before `async function changePayment`), insert:
```tsx

  // Set or clear the deadline. Optimistic; reverts on failure.
  async function changeDue(id: string, due_at: string | null) {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, due_at: due_at ?? undefined } : l)));
    try {
      const res = await fetch("/api/admin/due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, due_at }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) setLeads(prev);
    } catch {
      setLeads(prev);
    }
  }
```

1c. Find where `LeadDetail` is rendered with its handlers:
```tsx
                                onAmount={changeAmount}
```
Replace with:
```tsx
                                onAmount={changeAmount}
                                onDue={changeDue}
```

1d. In the `LeadDetail` prop signature, find:
```tsx
  onAmount: (id: string, amount: number) => void;
```
Replace with:
```tsx
  onAmount: (id: string, amount: number) => void;
  onDue: (id: string, due_at: string | null) => void;
```
And in its destructuring, find:
```tsx
  onAmount,
```
Replace with:
```tsx
  onAmount,
  onDue,
```

- [ ] **Step 2: `AdminLeadsTable.tsx` — due picker + payout hint in the assignment panel**

Find the amount input's closing (in `LeadDetail`):
```tsx
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-brand-dark outline-none focus:border-brand-red"
            />
          </label>
        </div>
```
Replace with:
```tsx
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-brand-dark outline-none focus:border-brand-red"
            />
          </label>

          {/* Deadline. Saves on change; clearing the field clears the deadline. */}
          <label className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{A.lifecycle.due}</span>
            <input
              type="date"
              defaultValue={lead.due_at ? lead.due_at.slice(0, 10) : ""}
              onChange={(e) => {
                const v = e.target.value;
                onDue(lead.id, v ? new Date(`${v}T18:00:00`).toISOString() : null);
              }}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-brand-dark outline-none focus:border-brand-red"
            />
          </label>

          {/* Expert payout hint — fixed EXPERT_SHARE, computed, never stored. */}
          {Number(lead.amount ?? 0) > 0 && (
            <span className="text-xs text-gray-400">
              {A.lifecycle.expertShare}:{" "}
              <span className="font-semibold text-brand-dark">
                {Math.round(Number(lead.amount) * EXPERT_SHARE)}₾
              </span>{" "}
              · {Math.round(EXPERT_SHARE * 100)}%
            </span>
          )}
        </div>
```

- [ ] **Step 3: `AdminLeadsTable.tsx` — lifecycle badges**

3a. Detail badges — find the end of the outcome/AI-draft row in `LeadDetail`:
```tsx
              {AI_DRAFT_ORDER.map((d) => (
                <option key={d} value={d} className="bg-white text-brand-dark">
                  {A.aiDraft[d]}
                </option>
              ))}
            </select>
          </label>
        </div>
```
Replace with:
```tsx
              {AI_DRAFT_ORDER.map((d) => (
                <option key={d} value={d} className="bg-white text-brand-dark">
                  {A.aiDraft[d]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Lifecycle badges: overdue / active revision / client acceptance. */}
        {((lead.due_at && new Date(lead.due_at).getTime() < Date.now() && lead.status !== "done") ||
          (lead.status === "in_progress" && lead.revision_note) ||
          lead.client_accepted) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            {lead.due_at &&
              new Date(lead.due_at).getTime() < Date.now() &&
              lead.status !== "done" && (
                <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-brand-red">
                  {A.lifecycle.overdue}
                </span>
              )}
            {lead.status === "in_progress" && lead.revision_note && (
              <span
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700"
                title={lead.revision_note}
              >
                🔁 {A.lifecycle.revisionRequested}
              </span>
            )}
            {lead.client_accepted && (
              <span className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {A.lifecycle.clientAccepted}
              </span>
            )}
          </div>
        )}
```

3b. Row overdue badge — find (in the row's status cell):
```tsx
                          <span
                            className={`mt-1 block w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_STYLES[payment]}`}
                          >
                            {A.assign.pay[payment]}
                          </span>
                        </td>
```
Replace with:
```tsx
                          <span
                            className={`mt-1 block w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_STYLES[payment]}`}
                          >
                            {A.assign.pay[payment]}
                          </span>
                          {lead.due_at &&
                            new Date(lead.due_at).getTime() < Date.now() &&
                            status !== "done" && (
                              <span className="mt-1 block w-fit rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-brand-red">
                                {A.lifecycle.overdue}
                              </span>
                            )}
                        </td>
```

- [ ] **Step 4: `lib/metrics.ts` — split tiles data**

4a. Add the import — find:
```ts
import type { StoredLead } from "@/lib/leadStore";
```
Replace with:
```ts
import type { StoredLead } from "@/lib/leadStore";
import { EXPERT_SHARE } from "@/lib/config";
```

4b. In the `Metrics` interface, find:
```ts
  revenueCollected: number; // sum(amount) where paid
```
Replace with:
```ts
  revenueCollected: number; // sum(amount) where paid
  expertShareCollected: number; // round(revenueCollected * EXPERT_SHARE)
  platformShareCollected: number; // revenueCollected - expertShareCollected
```

4c. In the return statement of `computeMetrics`, find:
```ts
    revenueCollected,
    revenueOutstanding,
```
Replace with:
```ts
    revenueCollected,
    expertShareCollected: Math.round(revenueCollected * EXPERT_SHARE),
    platformShareCollected: revenueCollected - Math.round(revenueCollected * EXPERT_SHARE),
    revenueOutstanding,
```

- [ ] **Step 5: `components/AdminMetrics.tsx` — the two tiles**

Find:
```tsx
              <Tile label={M.kpiCollected} value={`${fmt(metrics.revenueCollected)} ${M.gel}`} />
```
Replace with:
```tsx
              <Tile label={M.kpiCollected} value={`${fmt(metrics.revenueCollected)} ${M.gel}`} />
              <Tile
                label={M.kpiExpertShare}
                value={`${fmt(metrics.expertShareCollected)} ${M.gel}`}
              />
              <Tile
                label={M.kpiPlatformShare}
                value={`${fmt(metrics.platformShareCollected)} ${M.gel}`}
              />
```

- [ ] **Step 6: `components/AdminActivityTable.tsx` — AI roles legend**

Find (the count/storage/last-updated row):
```tsx
          <span className={`text-xs ${pollError ? "font-semibold text-brand-red" : "text-gray-400"}`}>
```
Locate the closing `</div>` of that whole `mb-5 flex flex-wrap items-center gap-3` block (it ends right before the filter-chips `<div className="mb-5 flex flex-wrap gap-2">`), and insert between the two blocks:
```tsx
        <p className="-mt-3 mb-5 text-xs text-gray-400">{C.rolesLegend}</p>
```
So the structure reads: count/storage row → legend line → filter chips.

- [ ] **Step 7: Verify + commit**

```bash
npx tsc --noEmit
curl -s http://localhost:3550/admin/metrics | grep -o "ექსპერტების წილი (70%)" | head -1
curl -s http://localhost:3550/admin/activity | grep -o "AI როუტერი\|AI კონსულტანტი" | sort -u
```
Expected: tsc clean; metrics page shows the new tile label; activity page shows the relabeled role badges.

```bash
git add components/AdminLeadsTable.tsx lib/metrics.ts components/AdminMetrics.tsx components/AdminActivityTable.tsx
git commit -m "Task lifecycle: admin due/payout/badges + split tiles + AI role legend"
```

---

### Task 8: Full regression + browser verification

**Files:** none (verification only)

- [ ] **Step 1: Clean build** (stop the :3550 dev server first — repo gotcha)

```bash
cd /Users/lukagvenetadze/Building/AI2B
# stop the dev server (kill the process listening on :3550)
rm -rf .next
npm run build
```
Expected: build completes with no new TS/ESLint errors.

- [ ] **Step 2: Restart the demo server**

```bash
AI2B_DEMO=1 npm run dev -- --port 3550
```
(Fresh process → fresh demo seed with the Task 2 lifecycle fields.)

- [ ] **Step 3: Browser walkthrough**

`/admin` (leads): demo-4 row shows the overdue badge; open demo-4's detail → assignment panel has the date input (2026-07-18), "ექსპერტის წილი: 525₾ · 70%" next to amount 750, and the 🔁 revision badge with the client's note on hover. demo-1's detail shows "კლიენტმა მიიღო ✓".

`/admin/metrics`: two new tiles — "ექსპერტების წილი (70%)" and "პლატფორმის წილი (30%)" (demo collected revenue 2670₾ → 1869₾ / 801₾).

`/admin/activity`: badges now read "AI კონსულტანტი" / "AI როუტერი" / "AI ბრიფი — ექსპერტის შეფასება"; the roles legend line renders under the header.

`/expert` (login `tamar@ai2b.ge` / `TAMAR-1592`): demo-4 card shows overdue + 🔁 badges and "ანაზღაურება: 525₾"; open it → orange revision block with the client's note above the brief; brief header reads "AI ბრიფის ავტორი"; header strip shows payout + due date.

`/business` (login `davit@greenmarket.ge` / `577 30 99 15`): demo-4 shows "🔁 შესწორება მოთხოვნილია — ექსპერტი მუშაობს" + due date. Log out, log in as `nini@brew.ge` / `599 21 33 44`: demo-1 shows "მიღებულია ✓" badge and NO accept/revise buttons. Log out, log in as `sopo@petshop.ge` / `596 77 88 33`: demo-7 (done, not accepted) shows both buttons — click "შესწორება მინდა", type a note, send → page refreshes, status flips to "მუშავდება" with the 🔁 note; then check `/expert` isn't affected (demo-7 belongs to seed-ana, not tamar) and `/admin` shows demo-7 back in in_progress with the revision badge.

ka/en toggle on every screen — all new labels switch language.

- [ ] **Step 4: Final branch check**

```bash
git log --oneline origin/main..HEAD
git status
```
Expected: clean tree; spec commit + 7 task commits on `feat/task-lifecycle`.

---

## Self-Review Notes

**Spec coverage:** migration/constant (T1) ✓ · projections + writers + revision-state rule + demo seed (T2) ✓ · three routes with ownership/guards/rate limits (T3) ✓ · all i18n incl. role relabels + legend + split-tile labels (T4) ✓ · expert payout/due/overdue/revision/brief-relabel (T5) ✓ · client ETA/accept/revise/badges, deliverables-optional actions (T6) ✓ · admin picker/hint/badges/tiles/legend (T7) ✓ · regression incl. negative curl cases in T3 and full browser pass (T8) ✓. Out-of-scope items (Resend, per-expert split, revision history, payout ledger, client-facing AI labels, landing copy) appear in no task.

**Type consistency:** `EXPERT_SHARE` defined once (T1), imported in `leadStore` (T2), `AdminLeadsTable` and `metrics` (T7). New `Lead` fields (T2 types.ts) match what `toExpertTask`/`toClientRequest` read (T2), what the writers set (T2), what routes guard on via `ClientRequest.status` (T3), and what all UI tasks render (T5-T7). i18n keys added in T4 (`briefAuthorTitle`, `payoutLabel`, `dueLabel`, `overdue`, `revisionTitle`; client lifecycle keys; `admin.lifecycle.*`, `admin.metrics.kpiExpertShare/kpiPlatformShare`, `admin.activity.rolesLegend`) exactly match every `T.*`/`A.*`/`C.*`/`M.*` reference in T5-T7.
