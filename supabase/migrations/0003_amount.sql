-- Deal amount (GEL) per lead, for revenue metrics.
-- Idempotent; run after 0002_assignment.sql.
alter table public.leads add column if not exists amount numeric not null default 0;
