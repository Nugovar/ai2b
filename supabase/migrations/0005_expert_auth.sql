-- Expert-portal login: per-expert email + admin-provisioned login_code.
-- Both are INTERNAL (server-only); never exposed in any client/chat payload.
-- Idempotent. Requires the `experts` table (supabase/experts.sql) to exist.
alter table public.experts add column if not exists email text;
alter table public.experts add column if not exists login_code text;

-- Fast, case-insensitive email lookup for login (and a guard against dupes).
create unique index if not exists experts_email_lower_idx
  on public.experts (lower(email))
  where email is not null;
