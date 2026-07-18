-- Chat-session persistence: every conversation is stored (not only converted
-- leads) — accumulated client context + lost-lead recovery for the admin.
-- Idempotent; run after 0006. RLS on with no policies = service-key only,
-- same posture as `leads`.
create table if not exists public.chat_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lang text,
  phase text,
  lead_captured boolean not null default false,
  messages jsonb
);

alter table public.chat_sessions enable row level security;

create index if not exists chat_sessions_updated_idx
  on public.chat_sessions (updated_at desc);
