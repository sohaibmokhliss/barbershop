# Barbershop Yassine - Personnel Web App

A minimal, production-ready Next.js app for barber Yassine to manage
appointments (rendez-vous). The personnel dashboard is protected with a
Supabase-backed login.

## Tech stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS
- Supabase Postgres (server-side only with service role key)
- Signed session cookie (HMAC-SHA256)
- Vercel

---

## Required environment variables

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server secret) |
| `SESSION_SECRET` | Random secret used to sign session cookies |

Security note:
- `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` are server-only.
- Do not expose them with `NEXT_PUBLIC_`.

Generate a strong `SESSION_SECRET`:

```bash
openssl rand -base64 32
```

---

## Local development

1. Clone and install dependencies:

```bash
git clone https://github.com/sohaibmokhliss/barbershop.git
cd barbershop
npm install
```

2. Create `.env.local` from the template:

```bash
cp .env.local.example .env.local
```

3. Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SESSION_SECRET`.

4. Run both SQL migrations in Supabase SQL Editor:

```sql
-- 1) appointments table
\i supabase/migrations/20260311000000_create_appointments.sql

-- 2) admin credentials table + default credential
\i supabase/migrations/20260312000100_create_admin_credentials.sql
```

If your SQL editor does not support `\i`, open each file and run it manually.

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## Default personnel credentials

Created by migration `supabase/migrations/20260312000100_create_admin_credentials.sql`:

- Login: `yassinem9`
- Password: `R4zor!Yassine_M9#2026@Casa`

To change it, update the migration seed statement or update the row in
`admin_credentials`.

---

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repository at `vercel.com/new`.
3. Add these environment variables in Vercel project settings:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
4. Deploy.
5. Ensure both Supabase SQL migrations are already run.

---

## Authentication flow

1. Browser posts `login + password` to `POST /api/auth/login`.
2. API hashes password with SHA-256.
3. API validates against Supabase table `admin_credentials`.
4. On success, API sets secure `httpOnly` session cookie.
5. Middleware allows `/admin/*` and `/api/appointments/*` only with valid cookie.

---

## npm scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
