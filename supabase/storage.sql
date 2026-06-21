-- ============================================================================
-- AI2Business — chat uploads (files + photos)
--
-- The app AUTO-CREATES the `chat-uploads` bucket on first upload (server-side,
-- via the SECRET key), so step 1 below is usually optional. Run this in the
-- Supabase SQL editor mainly for step 2:
--   1) (optional) Pre-create the PUBLIC Storage bucket `chat-uploads`. Public-
--      read is required so OpenAI can fetch image URLs. Uploads use short-lived
--      signed upload URLs minted by the server (client uploads directly).
--   2) Adds an `attachments` jsonb column to `leads` so each captured lead
--      remembers what the user shared (shown in the admin panel). REQUIRED for
--      admin persistence - there is no auto-migration for table columns.
--
-- Without step 2 the chat still works (vision + PDF reading); only the admin
-- panel won't list a lead's files.
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
