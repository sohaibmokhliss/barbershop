-- Migration: create appointments table
-- Run this once in your Supabase project via the SQL Editor.
--
-- Supabase SQL Editor: https://supabase.com/dashboard/project/<your-project-ref>/sql
-- Or use the Supabase CLI: supabase db push

create table if not exists appointments (
  id            uuid        primary key default gen_random_uuid(),
  client_name   text        not null,
  client_phone  text,
  starts_at     timestamptz not null,
  service       text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- Index to keep the default list query fast
create index if not exists idx_appointments_starts_at
  on appointments (starts_at asc);
