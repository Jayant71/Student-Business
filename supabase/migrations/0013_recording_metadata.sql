-- 0013_recording_metadata.sql
-- Adds optional metadata columns so recordings can expose human-friendly context in the UI.

alter table if exists public.recordings
  add column if not exists title text,
  add column if not exists duration text;

comment on column public.recordings.title is 'Display title shown to admins/students; defaults to linked session title when null';
comment on column public.recordings.duration is 'Optional duration string (e.g., 1:24:30) for quick reference in the UI.';
