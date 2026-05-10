---
name: nextjs-supabase-barbershop
description: Use when working on this repository's main application code: Next.js 15 App Router, React 19, TypeScript, Tailwind, and server-side Supabase integration for barbershop appointments and admin pages.
---

# Next.js Supabase Barbershop

Use this skill for normal feature or bugfix work in the app.

## Working model

- Read the relevant route in `app/` first, then trace supporting code in `lib/`.
- Keep data access and secret-bearing code on the server.
- Prefer targeted fixes over broad refactors.
- Preserve the French route structure and naming already used in `app/admin/calendrier` and `app/admin/rendezvous`.

## Repo map

- `app/admin/*`: protected admin pages.
- `app/api/*`: server endpoints.
- `lib/appointmentsRepo.ts`: appointment persistence.
- `lib/session.ts`: cookie signing and session verification.
- `lib/supabase.ts`: Supabase client creation.
- `supabase/migrations/*`: schema and seed changes.

## Default checks

- Run `npm run lint` after editing app logic.
- Run `npm run build` when touching routing, middleware, or shared server code.

