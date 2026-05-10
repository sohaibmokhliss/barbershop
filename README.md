# Barbershop Yassine - Web Admin + Offline-First Mobile Rebuild

A Next.js admin backend and a new Expo/React Native iPhone client for barber
Yassine to manage appointments offline and sync them back to Supabase when the
phone regains internet.

## Tech stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS
- Supabase Postgres (server-side only with service role key)
- Signed session cookie (HMAC-SHA256)
- Expo + React Native iPhone client
- Vercel

---

## Required environment variables

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server secret) |
| `SESSION_SECRET` | Random secret used to sign session cookies |
| `MOBILE_SESSION_SECRET` | Optional dedicated secret for mobile bearer tokens |

Security note:
- `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `MOBILE_SESSION_SECRET` are server-only.
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

4. Run all SQL migrations in Supabase SQL Editor:

```sql
-- 1) appointments table
\i supabase/migrations/20260311000000_create_appointments.sql

-- 2) admin credentials table + default credential
\i supabase/migrations/20260312000100_create_admin_credentials.sql

-- 3) updated_at support for mobile sync
\i supabase/migrations/20260416000000_add_appointments_updated_at.sql
```

If your SQL editor does not support `\i`, open each file and run it manually.

5. Start the web backend:

```bash
npm run dev
```

Open `http://localhost:3000`.

6. Start the Expo mobile app after installing its dependencies:

```bash
npm --prefix apps/mobile install
npm run mobile:start
```

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

## Web authentication flow

1. Browser posts `login + password` to `POST /api/auth/login`.
2. API hashes password with SHA-256.
3. API validates against Supabase table `admin_credentials`.
4. On success, API sets secure `httpOnly` session cookie.
5. Middleware allows `/admin/*` and `/api/appointments/*` only with valid cookie.

---

## Mobile sync flow

1. The iPhone app stores reservations locally first.
2. The app queues create, update, and delete operations while offline.
3. Mobile login uses `POST /api/mobile/auth/login`.
4. Pending operations sync through `POST /api/mobile/sync/push`.
5. Canonical server state refreshes through `GET /api/mobile/sync/pull`.

---

## npm scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run mobile:start` - start Expo for the iPhone app
- `npm run mobile:ios` - launch the Expo iOS target
- `npm run mobile:typecheck` - run TypeScript checks for the mobile app
