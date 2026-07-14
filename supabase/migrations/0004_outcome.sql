-- Outcome tracking (input -> action -> outcome) + the north-star signal:
-- how usable the AI's brief/advice was when an expert executed the task.
-- Idempotent; run after 0003_amount.sql.
alter table public.leads add column if not exists outcome text not null default 'pending';
alter table public.leads add column if not exists ai_draft_status text not null default 'unset';
