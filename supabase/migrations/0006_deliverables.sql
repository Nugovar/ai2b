-- Expert deliverables: files the assigned expert uploads as the finished work
-- (distinct from `attachments`, which are client-supplied inputs). Stored as a
-- JSON array of { url, name, type, size, isImage }. Idempotent; run after 0005.
alter table public.leads add column if not exists deliverables jsonb;
