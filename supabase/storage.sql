-- ============================================================================
-- AI2Business — chat uploads (files + photos)
--
-- Run this in the Supabase SQL editor AFTER experts.sql. It:
--   1) Creates a PUBLIC Storage bucket `chat-uploads` for files/photos that
--      users attach in the chat. Public-read is required so the OpenAI vision
--      model can fetch image URLs; writes happen only via the server SECRET key
--      (lib/storageStore.ts), which bypasses RLS.
--   2) Adds an `attachments` jsonb column to `leads` so each captured lead
--      remembers what the user shared (shown in the admin panel).
--
-- Without this, the app still works: uploads fall back to inline base64
-- data-URLs (vision works, but files are NOT persisted to the admin panel).
-- ============================================================================

-- 1) Public bucket for chat attachments. Idempotent.
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', true)
on conflict (id) do update set public = true;

-- Note: with the bucket marked public, anyone with the (unguessable) object URL
-- can read it. Writes/updates/deletes still require the service role (SECRET)
-- key, so the client/publishable key cannot upload. No extra policies needed
-- for the server-side flow; add user-scoped policies only if you later allow
-- client-side uploads.

-- 2) Persist the list of attachments with each lead.
alter table public.leads add column if not exists attachments jsonb;
