-- ============================================================================
-- AI2Business — experts directory (skill-based matching)
--
-- DESIGNERS are the FIRST test category. The same table/mechanism extends to
-- legal, development, marketing, business consulting later (just different
-- category + skill taxonomy). Run this in the Supabase SQL editor.
--
-- Privacy: phone / social / notes are INTERNAL admin-only. The server reads the
-- table with the SECRET key (bypasses RLS). RLS is enabled with no policies so
-- the publishable/client key can neither read nor write experts.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.experts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  category        text not null,              -- e.g. 'დიზაინი/ბრენდინგი'
  seniority       text not null default 'middle',  -- 'junior' | 'middle' | 'senior'
  years_experience int not null default 0,
  -- Per-skill scores 0-10. Keys for designers:
  -- logo, branding, poster, social_media, business_card, ui_ux, illustration
  skill_scores    jsonb not null default '{}'::jsonb,
  -- SEPARATE, strategically important dimension: ability to leverage AI tools.
  -- NOT part of skill_scores, NOT a tool. 0-10.
  ai_skill        numeric not null default 0,
  -- Professional design apps only (NO AI image generators here).
  tools           text[] not null default '{}',
  overall_rating  numeric not null default 0, -- 0-10, tiebreaker only
  available       boolean not null default true,
  city            text,                       -- optional, for future geo filtering
  -- INTERNAL admin-only. NEVER expose to client/chat.
  phone           text,
  social          text,
  notes           text
);

alter table public.experts enable row level security;

-- ---------------------------------------------------------------------------
-- 5 seed designers with DELIBERATELY different strengths so ranking changes
-- per task. category = 'დიზაინი/ბრენდინგი'. Internal phone/social/notes are
-- placeholders.
-- ---------------------------------------------------------------------------
insert into public.experts
  (name, category, seniority, years_experience, skill_scores, ai_skill, tools, overall_rating, available, city, phone, social, notes)
values
  -- 1) Logo / branding specialist, moderate AI
  ('ნინო კაპანაძე', 'დიზაინი/ბრენდინგი', 'senior', 9,
   '{"logo":9,"branding":9,"poster":5,"social_media":6,"business_card":7,"ui_ux":4,"illustration":5}'::jsonb,
   6, array['Illustrator','Photoshop','InDesign'], 9.0, true, 'თბილისი',
   '+995 599 10 00 01', '@nino.brand', 'ძლიერი ლოგო/ბრენდინგში; პრემიум კლიენტები.'),

  -- 2) Poster / social specialist
  ('გიორგი მჭედლიძე', 'დიზაინი/ბრენდინგი', 'middle', 6,
   '{"logo":6,"branding":5,"poster":9,"social_media":9,"business_card":6,"ui_ux":4,"illustration":6}'::jsonb,
   5, array['Photoshop','Illustrator','After Effects','Canva'], 8.2, true, 'თბილისი',
   '+995 599 10 00 02', '@giorgi.posters', 'სოც. მედია და პოსტერები; სწრაფი მიწოდება.'),

  -- 3) Senior all-rounder, HIGH ai_skill
  ('თამარ ბერიძე', 'დიზაინი/ბრენდინგი', 'senior', 10,
   '{"logo":8,"branding":8,"poster":7,"social_media":8,"business_card":7,"ui_ux":7,"illustration":7}'::jsonb,
   9, array['Figma','Photoshop','Illustrator','After Effects'], 9.2, true, 'ბათუმი',
   '+995 599 10 00 03', '@tamar.designs', 'ყველა მიმართულება; AI-workflow-ის ლიდერი გუნდში.'),

  -- 4) Junior, lower across the board but notably HIGH ai_skill (AI fluency != seniority)
  ('ლუკა გელაშვილი', 'დიზაინი/ბრენდინგი', 'junior', 2,
   '{"logo":5,"branding":4,"poster":6,"social_media":6,"business_card":5,"ui_ux":4,"illustration":5}'::jsonb,
   8, array['Figma','Canva','Photoshop'], 7.0, true, 'თბილისი',
   '+995 599 10 00 04', '@luka.ai.design', 'ჯუნიორი, იაფი; ძალიან კარგად იყენებს AI ხელსაწყოებს.'),

  -- 5) Mid focused on UI/UX + illustration
  ('ანა ხურციძე', 'დიზაინი/ბრენდინგი', 'middle', 5,
   '{"logo":5,"branding":6,"poster":5,"social_media":6,"business_card":4,"ui_ux":9,"illustration":9}'::jsonb,
   6, array['Figma','Procreate','Illustrator'], 8.5, true, 'ქუთაისი',
   '+995 599 10 00 05', '@ana.uiux', 'UI/UX და ილუსტრაცია; პროდუქტ-დიზაინის გამოცდილება.');

-- ---------------------------------------------------------------------------
-- Add task-matching columns to `leads` so each captured lead remembers the
-- category + required skills the model picked, for ranking experts in admin.
-- (Idempotent; safe to run on the existing leads table.)
-- ---------------------------------------------------------------------------
alter table public.leads add column if not exists category       text;
alter table public.leads add column if not exists required_skills text[];
alter table public.leads add column if not exists ai_relevant     boolean default false;
