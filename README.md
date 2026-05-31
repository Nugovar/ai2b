# AI2Business — Interview Demo MVP

ქართული AI პლატფორმა მცირე და საშუალო ბიზნესისთვის. A premium landing page with a
3-phase AI consultant chatbot (discovery → advice → expert handoff + lead capture).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · OpenAI (`gpt-4o-mini`, server-side only) · Supabase (Postgres) · Vercel.

---

## 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
OPENAI_API_KEY=sk-...                       # server-side ONLY, never exposed to client
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # browser-safe anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # server-side ONLY (writes leads)
ADMIN_PASSWORD=choose-a-password            # demo gate for /admin (if unset, /admin is open)
```

### Admin panel (`/admin`)

A read-only panel listing leads captured from the chat's expert-handoff flow (name,
phone, email, category, conversation context, status, date; newest first). It reads
from Supabase when configured, otherwise from the in-memory fallback, and shows a
friendly empty state when there are no leads. A status dropdown (new / in progress /
done) updates each lead.

- **Open it:** `/admin` — if `ADMIN_PASSWORD` is set you'll get a password prompt
  (or go straight to `/admin?key=YOUR_PASSWORD`).
- **Protection is demo-grade only.** It's a single shared password compared on the
  server, not real authentication. **In production the gate is fail-closed:** if
  `ADMIN_PASSWORD` is unset in a deployed build, `/admin` is locked (no bypass). In
  local dev only, leaving it unset opens the panel with a visible warning banner. Do
  not treat this as production-grade security. (Full user auth + saved conversations
  are intentionally out of scope here.)
- **In-memory note:** without Supabase, leads live in server memory and reset on
  restart; on serverless (Vercel) memory isn't shared across instances, so use Supabase
  for a persistent admin view.

> The chat still runs without Supabase — leads fall back to an in-memory store and a
> console warning is logged, so the demo never crashes. Only `OPENAI_API_KEY` is
> required for the chat to produce real answers.

## 2. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

**Test checklist**
- Header nav links smooth-scroll to each section; mobile hamburger opens/closes and its links work.
- Every CTA ("დაიწყე ჩატით", "აღწერე შენი საჭიროება") opens the chat panel.
- Chat: bot greets first; quick-reply chips send on click; free-text input + Enter works; typing indicator shows.
- The bot asks one question at a time and refuses to advise until it has ~3–4 context slots, then recommends, then offers expert handoff.
- Agreeing to handoff shows the lead form; submitting validates and shows the ✅ confirmation in-chat.

## 3. Supabase setup (SQL)

In the Supabase SQL editor, run:

```sql
-- Leads captured during the conversion phase (Phase 1–3).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  business_type text,
  summary text,
  slots jsonb,            -- structured discovery context (business_type, goal, budget, ...)
  advice text,            -- the concrete advice the bot gave before handoff
  conversation jsonb,     -- full transcript (user + bot)
  status text not null default 'new'
);

-- If you created the table before slots/advice existed, migrate with:
--   alter table public.leads add column if not exists slots jsonb;
--   alter table public.leads add column if not exists advice text;

-- Phase 4 (optional): saved conversations for logged-in users.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  messages jsonb
);

-- The server writes leads with the service-role key (bypasses RLS).
alter table public.leads enable row level security;
alter table public.conversations enable row level security;

-- Phase 4: let users read/write only their own conversations.
create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Experts directory (skill-based matching)

Run `supabase/experts.sql` in the Supabase SQL editor. It creates the `experts`
table (RLS on, server-only via the secret key), seeds 5 designers with
deliberately different strengths, and adds task columns (`category`,
`required_skills`, `ai_relevant`) to `leads`.

- The model emits `category` + `required_skills` (+ `ai_relevant`) for a task in
  the control JSON. Code ranks experts deterministically (`lib/match.ts`):
  filter by category + availability → task score = avg of required skill_scores
  (+ `ai_skill` if AI-relevant) → tie-break by all-skills avg, then ai_skill,
  then overall_rating, then seniority/years. Reasons are shown in admin.
- `ai_skill` is a **separate** strategic dimension (not a skill, not a tool);
  AI image generators are intentionally NOT listed in `tools`.
- **DESIGNERS are the first test category.** Legal / development / marketing /
  business consulting plug in later with their own skill keys.
- **Privacy:** `phone` / `social` / `notes` are internal and only ever rendered
  on the gated `/admin/experts` page (server-side). Matching + lead-detail use a
  public-stripped expert shape (`PublicExpert`).
- Works without Supabase too: an in-memory seed mirrors the 5 designers.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add all env vars (from step 1) in **Project → Settings → Environment Variables**.
4. Deploy. The OpenAI key stays server-side (used only in `app/api/chat/route.ts`).

---

## Architecture notes

- **No OpenAI key on the client.** All model calls go through `app/api/chat/route.ts`.
- **Control signal:** the model appends a trailing JSON block (`phase`, `slots`, `showLeadForm`, `chips`). The server parses & strips it (`lib/parseControl.ts`) and returns `{ reply, control }`. The UI uses `control` to drive chips and the lead form reliably.
- **System prompt:** `lib/systemPrompt.ts` (Georgian) enforces the discovery → advice → conversion flow and one-question-at-a-time discovery.
- **Lead store:** `lib/leadStore.ts` writes to Supabase or falls back to memory.

## Build order / status

1. ✅ Static landing page (header, hero, how-it-works, services, contact, footer) — all links/buttons wired.
2. ✅ Chat widget UI (launcher, panel, messages, typing indicator, chips + input).
3. ✅ `/api/chat` + system prompt + 3-phase logic + slot tracking + lead capture (Supabase + in-memory fallback).
4. ⬜ (Optional) Supabase Auth, saved conversations, `/admin` leads page.

## Logo

Place the brand PNG at `public/logo.png` (red "AI2B" wordmark on dark). The header and
footer reference `/logo.png`.
