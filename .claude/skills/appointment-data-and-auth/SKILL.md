---
name: appointment-data-and-auth
description: Use when changing appointment persistence, admin authentication, session cookies, middleware protection, or Supabase schema for this barbershop project.
---

# Appointment Data And Auth

This skill applies to the sensitive parts of the repo.

## Safety rules

- Do not move `SUPABASE_SERVICE_ROLE_KEY` into browser-executed code.
- Keep session cookies `httpOnly` and validated on protected routes.
- Treat default credentials in migrations as seed data, not application constants.
- Prefer schema changes via new migration files rather than editing old migrations unless the repo explicitly wants squash-style history.

## Files to inspect together

- `middleware.ts`
- `lib/session.ts`
- `lib/supabase.ts`
- `lib/appointmentsRepo.ts`
- `app/api/appointments/route.ts`
- `supabase/migrations/*`

## Verification

- Check both authenticated and unauthenticated flows.
- Reconfirm that admin pages remain inaccessible without a valid session.
- If schema changes, note required migration execution in the final response.

