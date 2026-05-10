---
name: appointment-data-and-auth
description: Use when changing appointment persistence, admin authentication, session cookies, middleware protection, or Supabase schema for this barbershop project.
---

# Appointment Data And Auth

- Do not move `SUPABASE_SERVICE_ROLE_KEY` into browser-executed code.
- Inspect `middleware.ts`, `lib/session.ts`, `lib/supabase.ts`, `lib/appointmentsRepo.ts`, and `app/api/appointments/route.ts` together for auth-sensitive changes.
- Prefer new migration files over rewriting existing migrations unless explicitly requested.
- Recheck authenticated and unauthenticated flows after changes.

