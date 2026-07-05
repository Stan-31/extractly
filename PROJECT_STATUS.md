# Extractly — Project Status

Read this whole file before doing anything else in a new session. It's the
recap of everything built so far, the gotchas that cost real time to work
out, and exactly what to do next.

## What Extractly is

Invoice-extraction SaaS: user uploads an invoice (PDF/image) → OCR (Mistral
primary) + Claude extraction → structured data → Excel export. Supabase for
auth/DB/storage, Prisma as the ORM, Stripe planned for subscriptions
(not started).

## Completed Features

- [x] **Feature 1: Folder Structure** — Next.js 16 + Tailwind v4 + shadcn/ui (Nova preset) + Prisma 7 scaffold
- [x] **Feature 2: Database & Prisma** — `User`/`Upload`/`Invoice`/`Subscription` schema, migrated against Supabase Postgres (transaction pooler for the app, session pooler for migrations — see `prisma.config.ts`), plus a Postgres trigger (`prisma/migrations/20260704150252_add_user_sync_trigger`) that mirrors new Supabase Auth users into `public.users`.
- [x] **Feature 3: Auth guard** — `proxy.ts` + `lib/supabase/middleware.ts` refresh the Supabase session, redirect unauthenticated users away from `/dashboard`, redirect authenticated users away from `/login` + `/register`, and exchange the `?code=` param from Supabase email links (confirmation/magic-link) for a session. Real login/register forms (`components/auth/`) wired to Supabase Auth; dashboard header shows the signed-in user + sign-out (`components/dashboard/sign-out-button.tsx`).
- [x] **Feature 4: Upload flow** — private `uploads` Supabase Storage bucket (10 MB limit, PDF/PNG/JPEG/WEBP only, RLS scoped per-user via `prisma/migrations/20260705080355_add_uploads_storage_bucket`). `app/api/upload/route.ts` validates the file (Zod, `schemas/index.ts`), stores it under `${userId}/${uploadId}.${ext}`, creates an `Upload` row (`status: PENDING`). Dashboard (`app/dashboard/page.tsx`) has a drag-and-drop zone (`components/dashboard/upload-dropzone.tsx`, react-dropzone) and a status list (`components/dashboard/uploads-list.tsx`).

Both committed to `main`: `80375f3` (Features 2–3), `37ab075` (Feature 4).

## Next Milestone — Feature 5: OCR + extraction

Uploads currently sit at `PENDING` forever. Next step:
1. Wire `lib/ocr/index.ts` (stub says "Mistral primary, Google Vision fallback") to actually call Mistral OCR on a `PENDING` upload's storage file.
2. Move the `Upload.status` to `PROCESSING` → `COMPLETED`/`FAILED` (`errorMessage` on failure — the UI already renders this).
3. Feed the OCR text to Claude (`lib/anthropic.ts` already has the client) to extract structured fields and create the matching `Invoice` row (schema already has `vendorName`, `invoiceNumber`, `invoiceDate`, `dueDate`, `currency`, `subtotal`, `taxAmount`, `totalAmount`, `lineItems` JSON, `rawExtraction` JSON).
4. Decide/implement the trigger: a route handler called right after upload succeeds (simplest, synchronous) vs. a background job/queue (better UX for slow OCR, more infra). Given no queue infra exists yet, start synchronous inside `app/api/upload/route.ts` or a follow-up `app/api/extract/route.ts` (already stubbed, currently 501) and revisit if it's too slow.
5. After that: `app/api/export/route.ts` (Excel export via `lib/excel.ts`, `exceljs` already a dependency) and `app/dashboard/invoices` (list/detail UI) are the logical Feature 6+.
6. Stripe subscriptions (`Subscription` model already exists) are last — no work started, env vars still commented out in `.env.local`.

## Known Gotchas (read before you burn time rediscovering these)

**1. TLS interception on this network breaks server-side Node fetches.**
Any Node-side HTTPS call (Prisma CLI hitting a registry, Supabase Auth/Admin
calls from middleware, npm install, `npx shadcn add`) fails with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` unless `NODE_OPTIONS=--use-system-ca` is
set. This is baked into `dev`/`build`/`start` in `package.json` via
`cross-env`. **If you add a new npm script or run `node`/`npx` directly,
prefix it the same way** — e.g. `npx shadcn add X` needs
`NODE_OPTIONS="--use-system-ca" npx shadcn add X`, and plain `npm install`
needs the same prefix too. This bug is sneaky: it fails silently inside
`proxy.ts`'s `getUser()` call, which makes the auth guard look like it's
"not working" when actually it's just never seeing a valid session.

**2. `prisma migrate dev` cannot be used once a migration references
`auth.*` or `storage.*` schemas** (both Supabase-only, not present in
Prisma's shadow database). It'll fail with `schema "auth" does not exist` or
similar, for every migration after that point, even unrelated ones. Workflow
for any new migration going forward:
```
mkdir -p "prisma/migrations/$(date -u +%Y%m%d%H%M%S)_<name>"
# write migration.sql by hand into that folder
npx prisma migrate deploy   # NOT `migrate dev` — deploy skips the shadow DB
```
Do not attempt `prisma migrate dev` again in this project unless Supabase's
shadow-DB limitation gets fixed upstream.

**3. Supabase signup has an aggressive per-IP email rate limit** ("email
rate limit exceeded"). Don't hammer `/register` repeatedly while testing —
space out signup attempts, or use the Admin API with the service role key to
confirm/create test users directly instead of going through real emails.

**4. Email confirmation is ON for this Supabase project.** New signups via
`/register` need the confirmation email clicked before `signInWithPassword`
works (`"Email not confirmed"` error otherwise). For fast local testing,
confirm via Admin API instead of waiting on email:
```
PUT https://uaqrleefsgqqxdgxbjck.supabase.co/auth/v1/admin/users/<user-id>
Headers: apikey / Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Body: { "email_confirm": true }
```

**5. A stale `next dev` process serves stale `NEXT_PUBLIC_*` env vars.**
Those are inlined at build/start time. If you add/change anything in
`.env.local`, kill and restart the dev server — hot reload does not pick up
new env vars.

## Test Account

For manual testing without burning more real signups:
- Email: `stanleysullivan316+extractly-test2@gmail.com`
- Password: `TestPassword123!`
- Already confirmed (via Admin API) and has one test `Upload` row
  ("test-invoice.pdf", status PENDING) — harmless, safe to ignore or delete.

## Tech Stack Notes

- **Next.js 16** (Turbopack by default, `middleware.ts` renamed to `proxy.ts` — this is NOT the Next.js you know, see `AGENTS.md`)
- **Tailwind v4** (CSS-based config, no `tailwind.config.ts`)
- **shadcn/ui v4** (Nova preset — Lucide icons, Geist font). To add components: `NODE_OPTIONS="--use-system-ca" npx shadcn@latest add <name>` (gotcha #1 applies).
- **Prisma 7** (config in `prisma.config.ts`, not in `schema.prisma` — `url`/`directUrl` datasource fields were removed from the schema file in Prisma 7). See gotcha #2 for migrations.
- **React 19**
- **Supabase Auth** — email/password via `@supabase/ssr`. See gotchas #3–#4.
- Dev server convention this session: run `npm run dev` in the background, log to the scratchpad dir, curl-poll `http://localhost:3000/` until it responds before driving it with the browser.

## Current Git Commit

- **Hash:** `37ab075`
- **Branch:** `main`
- **Repo:** https://github.com/Stan-31/extractly
