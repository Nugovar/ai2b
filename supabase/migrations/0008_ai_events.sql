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
