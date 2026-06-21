# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI2Business** is a Georgian-language AI platform for small and medium businesses. It features a 3-phase AI consultant chatbot (discovery → advice → conversion) that guides users through identifying needs, receiving tailored recommendations, and optionally connecting with expert professionals.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · OpenAI (gpt-4o-mini, server-side only) · Supabase (PostgreSQL) · Vercel

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000) with NODE_OPTIONS=--use-system-ca
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Next.js ESLint
```

No test runner is configured.

## Environment Variables

Copy `.env.local.example` → `.env.local`:

| Variable | Side | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Server only | Chat completions |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe | Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-safe | Anon/public key |
| `SUPABASE_SECRET_KEY` | Server only | Admin writes (leads/experts) |
| `ADMIN_PASSWORD` | Server only | Demo gate for `/admin` |

Without Supabase env vars the app falls back to in-memory stores (leads/experts reset on restart). Without `OPENAI_API_KEY` the chat endpoint fails.

## Architecture

### Three-Phase Chatbot Flow

The conversation is enforced in exactly three phases:

1. **Discovery** — bot asks one question at a time to fill context slots (`business_type`, `goal`, `audience`, `budget`, `timeline`, `city`, `district`, `branches`). No advice given yet.
2. **Advice** — after ~2-4 relevant slots, bot gives concrete tailored recommendations, then asks if the user wants expert help with chips ["კი", "ჯერ არა"].
3. **Conversion** — only after explicit "კი" consent does the lead form appear. On submit, lead is saved and confirmation shown.

### Control Signal (Model → UI)

The model always returns a strict JSON object (OpenAI JSON mode):

```json
{
  "reply": "User-facing text",
  "phase": "discovery|advice|conversion",
  "slots": { "business_type": "კაფე", "budget": "5000-10000 GEL" },
  "showLeadForm": false,
  "chips": ["ვარიანტი 1", "ვარიანტი 2"],
  "category": "დიზაინი/ბრენდინგი",
  "required_skills": ["logo", "branding"],
  "ai_relevant": false
}
```

The server parses this in `lib/parseControl.ts` and hard-guards `showLeadForm` (only true in conversion phase). The UI is driven entirely by these structured signals.

### Key Files

| Path | Purpose |
|---|---|
| `app/api/chat/route.ts` | OpenAI call, phase enforcement, JSON parsing |
| `app/api/lead/route.ts` | Lead capture POST |
| `app/admin/page.tsx` | Admin panel (server-rendered, password-gated) |
| `lib/systemPrompt.ts` | Georgian system prompt (~20KB) — controls all bot behavior |
| `lib/config.ts` | `MARKETING_ONLY` feature flag |
| `lib/types.ts` | All shared types: `ChatMessage`, `ChatControl`, `Lead`, `Expert` |
| `lib/leadStore.ts` | `saveLead`, `listLeads`, `updateLeadStatus`, `deleteLead` |
| `lib/expertStore.ts` | `listExperts`, `toPublicExpert` (strips internal fields from public API) |
| `lib/match.ts` | `rankExperts()` — pure, deterministic ranking function |
| `lib/i18n.ts` | Georgian (ka, default) + English (en) copy dictionaries |
| `lib/supabaseServer.ts` | Server-side Supabase client (SECRET key, timeouts) |
| `components/ChatProvider.tsx` | Global context: messages, control, language, lead form state |
| `components/ChatBody.tsx` | Conversation UI, chips, uncontrolled textarea input |
| `supabase/experts.sql` | Table schema + 5 seeded designer experts |

### Dual-Store Resilience

Both `leadStore` and `expertStore` try Supabase first, log a warning on failure, and fall back to an in-memory store. No crashes on Supabase unavailability.

### Expert Matching

Located in `lib/match.ts`. Filters by category + availability, scores by average of `required_skills` (plus `ai_skill` if `ai_relevant`), then ties break deterministically by: `all_avg → ai_skill → overall_rating → seniority → years_experience`. The `tieBreakBy` reason maps to i18n labels shown in the admin panel.

### IME / Georgian Input

`ChatBody`'s textarea is **uncontrolled** (ref-based). React never re-sets the value during composition events, which prevents Georgian character drops. The ref is read only on send.

### i18n

`lib/i18n.ts` exports `getDict(lang)`. Components access it via `useApp()` → `t.section.field`. Switching language resets the entire conversation (new opening message, cleared slots/advice/lead form).

## Feature Flag: MARKETING_ONLY

`lib/config.ts` exports `MARKETING_ONLY` (currently `true`). When true:
- Initial chips are marketing-focused
- Bot politely defers non-marketing requests as "coming soon"
- Services section shows only Marketing as active

Set to `false` to re-enable all categories.

## Secrets Boundary

- **Server only:** `OPENAI_API_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`
- These must never appear in components or client-side code
- `lib/supabaseServer.ts` and `app/api/` are the only permitted locations for secret env vars

## Supabase Setup

Run `supabase/experts.sql` in the Supabase SQL editor to create both the `leads` and `experts` tables and seed 5 designer experts. Both tables use RLS; the service role key bypasses it for admin writes.

## Admin Panel

- `/admin` — leads table with status dropdowns; shows top 3 matched experts per lead
- `/admin/experts` — expert directory with internal fields (phone, social, notes)
- Password-gated by `ADMIN_PASSWORD`; in dev without the password, opens with a warning banner
- In production, if `ADMIN_PASSWORD` is unset, `/admin` is locked (no bypass)
