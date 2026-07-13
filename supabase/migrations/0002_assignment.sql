-- Task assignment + payment tracking on leads.
-- Turns a captured lead into a workable task: which expert it's assigned to and
-- where it is in the payment lifecycle (unpaid -> invoiced -> paid).
-- Idempotent; run in the Supabase SQL editor after 0001_leads.sql.

alter table public.leads add column if not exists assigned_expert_id text;
alter table public.leads add column if not exists assigned_expert_name text;
alter table public.leads add column if not exists payment_status text not null default 'unpaid';
