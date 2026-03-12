-- Migration: add Supabase-backed admin credentials
-- Default login credentials:
--   username: yassinem9
--   password: R4zor!Yassine_M9#2026@Casa

create extension if not exists pgcrypto;

create table if not exists admin_credentials (
  id            uuid        primary key default gen_random_uuid(),
  username      text        not null unique,
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

insert into admin_credentials (username, password_hash)
values (
  'yassinem9',
  encode(digest('R4zor!Yassine_M9#2026@Casa', 'sha256'), 'hex')
)
on conflict (username) do update
set password_hash = excluded.password_hash;
