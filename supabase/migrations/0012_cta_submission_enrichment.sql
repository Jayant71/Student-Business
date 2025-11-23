-- 0012_cta_submission_enrichment.sql
-- Adds contextual fields captured from the public CTA form

alter table if exists public.cta_submissions
  add column if not exists preferred_time_slot text;

alter table if exists public.cta_submissions
  add column if not exists source text default 'landing-page';
