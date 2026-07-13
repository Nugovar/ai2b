-- Authoritative, idempotent `leads` schema + RLS.
-- Safe to run repeatedly. Run this in the Supabase SQL editor.
--
-- The server writes leads with the SECRET (service-role) key, which bypasses
-- RLS. RLS is enabled with NO public policy, so the anon/public key cannot read
-- or write leads (PII stays server-only).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text,
  email text,
  business_type text,
  summary text,
  slots jsonb,                 -- structured discovery context
  advice text,                 -- the concrete advice given before handoff
  conversation jsonb,          -- full transcript (user + bot)
  category text,               -- expert category (task signal)
  required_skills jsonb,       -- skill keys the task needs
  ai_relevant boolean default false,
  attachments jsonb,           -- files/photos attached in the conversation
  status text not null default 'new'
);

-- Backfill columns for older tables created before these fields existed.
alter table public.leads add column if not exists business_type text;
alter table public.leads add column if not exists summary text;
alter table public.leads add column if not exists slots jsonb;
alter table public.leads add column if not exists advice text;
alter table public.leads add column if not exists conversation jsonb;
alter table public.leads add column if not exists category text;
alter table public.leads add column if not exists required_skills jsonb;
alter table public.leads add column if not exists ai_relevant boolean default false;
alter table public.leads add column if not exists attachments jsonb;
alter table public.leads add column if not exists status text not null default 'new';

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- Lock it down: RLS on, no public policy (only the service-role key gets in).
alter table public.leads enable row level security;
