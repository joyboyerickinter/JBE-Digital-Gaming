# JBE Digital + Gaming — Phase 1

Phase 1 builds the public catalog foundation with the existing clean JBE visual style.

## What is included
- Next.js 15 App Router
- JBE Digital + Gaming branding
- Product + package card UI
- Public B2C catalog
- Supabase browser client scaffold
- Supabase SQL schema with separate B2C/reseller price tables
- RLS policies for public B2C access and authenticated reseller/admin access
- `.env.example` for Supabase connection
- `/login` placeholder for Phase 2 authentication

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Put your Supabase Project URL and Publishable Key into `.env.local`.
3. In Supabase Dashboard → SQL Editor, run `supabase/schema.sql`.
4. Run:

```bash
npm install
npm run dev
```

5. Open `http://localhost:3000`.

If Supabase variables are still placeholders, the site automatically uses the demo catalog, so the UI can be tested before connecting the database.

## GitHub

Recommended repository name: `JBE-Digital-Gaming`.

Do **not** commit `.env.local`. It is ignored by `.gitignore`.

## Phase 2
- Supabase email/password login
- Admin/reseller roles
- Admin product/package/price management
- 10-account limit
- Reseller price visibility
- Invoice creation + server-side invoice numbering
- PDF invoice generation
