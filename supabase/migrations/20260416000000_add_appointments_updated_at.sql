-- Migration: add sync-friendly updated_at tracking to appointments

alter table if exists appointments
  add column if not exists updated_at timestamptz not null default now();

update appointments
set updated_at = coalesce(updated_at, created_at, now());

create or replace function set_appointments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_appointments_updated_at on appointments;

create trigger trg_appointments_updated_at
before update on appointments
for each row
execute function set_appointments_updated_at();

