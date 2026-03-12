# Barbershop Yassine — Personnel Web App

A minimal, production-ready Next.js application for barber Yassine to manage
appointments (rendez-vous). Protected by a single shared admin password —
no public booking, no user accounts.

## Tech stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Supabase Postgres** for persistence (server-side only via service role key)
- **HMAC-SHA256 signed cookies** for session management
- **Vercel** for deployment

---

## Required environment variables

| Variable                  | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| `ADMIN_PASSWORD`          | The single login password for the dashboard                      |
| `SUPABASE_URL`            | Your Supabase project URL (`https://xxx.supabase.co`)            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret — never expose to browser)   |
| `SESSION_SECRET`          | Random string (≥ 32 chars) used to sign session cookies          |

> **Security note:** `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, and
> `SESSION_SECRET` are server-only variables. They must **never** be prefixed
> with `NEXT_PUBLIC_` and are never sent to the browser.

Generate a strong `SESSION_SECRET`:
```bash
openssl rand -base64 32
```

---

## Local development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### Steps

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/sohaibmokhliss/barbershop.git
   cd barbershop
   npm install
   ```

2. **Create your local environment file:**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the four variables in `.env.local`.

3. **Run the SQL migration** (see section below).

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Running the SQL migration in Supabase

1. Go to your Supabase project → **SQL Editor**.
2. Open a new query and paste the contents of:
   ```
   supabase/migrations/20260311000000_create_appointments.sql
   ```
3. Click **Run**.

This creates the `appointments` table and an index on `starts_at`.

---

## Project structure

```
barbershop/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST — verify password, set cookie
│   │   │   └── logout/route.ts     # POST — clear cookie
│   │   └── appointments/
│   │       ├── route.ts            # GET (list) + POST (create)
│   │       └── [id]/route.ts       # PATCH (update) + DELETE
│   ├── admin/rendezvous/
│   │   ├── page.tsx                # Server component — fetches initial data
│   │   └── RendezvousClient.tsx    # Client component — CRUD UI
│   ├── login/page.tsx              # Login form
│   ├── page.tsx                    # Public home page
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── session.ts                  # HMAC session token helpers
│   ├── supabase.ts                 # Server-side Supabase client
│   └── types.ts                    # Shared TypeScript types
├── middleware.ts                   # Auth guard (Edge Runtime)
├── supabase/migrations/
│   └── 20260311000000_create_appointments.sql
└── .env.local.example
```

---

## Vercel deployment

1. **Push the repo to GitHub** (the `.gitignore` already excludes `.env.local`).

2. **Import the project** on [vercel.com/new](https://vercel.com/new).

3. **Add environment variables** in the Vercel project settings → **Environment Variables**:
   - `ADMIN_PASSWORD`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`

4. Vercel auto-detects Next.js and deploys with the correct build command (`next build`) and output directory.

5. After the first deploy, run the SQL migration in Supabase (if you haven't already).

---

## Authentication flow

```
Browser                         Server (middleware)          Login API
  |                                    |                         |
  |-- GET /admin/rendezvous ---------> |                         |
  |                          checks cookie (HMAC)                |
  |<-- 302 /login (no valid cookie) ---|                         |
  |                                                              |
  |-- POST /api/auth/login (password) -----------------------> |
  |                                              verify vs ADMIN_PASSWORD
  |                                              create HMAC-signed token
  |<-- 200 OK + Set-Cookie: session=... ----------------------- |
  |                                                              |
  |-- GET /admin/rendezvous ---------> |                         |
  |                          HMAC verified ✓                     |
  |<-- 200 Dashboard ------------------|                         |
```

---

## npm scripts

| Command       | Description                     |
| ------------- | ------------------------------- |
| `npm run dev`   | Start local dev server          |
| `npm run build` | Build for production            |
| `npm run start` | Start production server locally |
| `npm run lint`  | Run ESLint                      |
