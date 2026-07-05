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
- [x] **Feature 5: OCR + extraction** — `lib/invoice-processing.ts` (`processUpload`) runs synchronously right after upload: `lib/ocr/index.ts` calls Mistral OCR (`mistral.ocr.process`, PDF via `document_url`/image via `image_url`, joins `pages[].markdown`), then `lib/extraction/index.ts` (`extractInvoiceData`) feeds that text to Claude (`claude-opus-4-8` via `messages.parse` + `zodOutputFormat(invoiceExtractionSchema)` from `schemas/index.ts`) to get structured fields. `Upload.status` moves `PENDING` → `PROCESSING` → `COMPLETED`/`FAILED` (`errorMessage` set on failure), and the result is upserted into `Invoice` keyed on `uploadId`. `app/api/upload/route.ts` triggers this inline on upload; `app/api/extract/route.ts` is a manual retry endpoint for an existing `Upload` (re-downloads from storage). Verified via `tsc --noEmit` against the real Mistral/Anthropic SDK types. One real attempt was made (`test-invoice.pdf`) and it reached the Claude API call but failed with `"Your credit balance is too low to access the Anthropic API"` — the Anthropic account backing this project has no credits, so the pipeline itself is still unverified end-to-end. See Still Owed.
- [x] **Feature 6: Excel export + invoices list UI** — `app/api/export/route.ts` streams an `.xlsx` (via `lib/excel.ts`'s `buildInvoiceWorkbook`, `exceljs`) for a given `invoiceId`, scoped to the signed-in user. `lib/invoice-serializer.ts` (`serializeInvoice`) converts a Prisma `Invoice` (+ its `upload.fileName`) into the `InvoiceDetail` shape from `types/index.ts` (Decimal → number, Date → ISO string). `app/dashboard/invoices/page.tsx` lists all of the user's `Invoice` rows; `app/dashboard/invoices/[id]/page.tsx` is the detail view with an export link/button. `app/api/invoices/route.ts` and `app/api/invoices/[id]/route.ts` back these with real Prisma queries (no longer 501 stubs). Tested manually: since the Anthropic account has no credits, a fake `Upload`+`Invoice` pair was inserted directly into the DB (via a temporary dev-only API route, deleted after use — not via real OCR/extraction) to exercise the list/detail/export UI. User confirmed it all works.

Committed to `main`: `80375f3` (Features 2–3), `37ab075` (Feature 4), `9539a47` (Feature 5), `75d059d` (Feature 6).

## Workflow (read this before touching anything)

For every feature/step:
1. Code gets written and verified with `tsc --noEmit` / build, but **not** committed yet.
2. I tell you exactly what to click/run to test it manually.
3. You test it and confirm it works (or report what broke).
4. Only after you confirm — I commit the step and push to GitHub.
5. Only then is the step marked done in this file.

No step is committed or pushed without an explicit "it works" from you first.

## Still Owed / Not Started

- **Live end-to-end test of Feature 5's OCR/extraction pipeline** — still not exercised with a real API call. The Anthropic API key on this project currently has **no credit balance** — a real upload attempt (`test-invoice.pdf`) reached the Claude call and failed with `"Your credit balance is too low to access the Anthropic API"`. Needs credits added to the Anthropic account before this can be verified. Watch for: Mistral OCR response shape assumptions in `lib/ocr/index.ts` (only `pages[].markdown` is used — table/image blocks are ignored), and whether `claude-opus-4-8` structured output reliably returns `parsed_output` (code currently throws if it's null).
- **Stripe subscriptions** (`Subscription` model already exists) — no work started, env vars still commented out in `.env.local`. Last planned feature.
- The test account (see Test Account below) has one **manually-seeded** `Invoice`/`Upload` pair (vendor "Northwind Office Supplies Ltd.", `INV-2026-00417`) used to test Feature 6's UI without spending API credits — it did not come from real OCR/extraction. Fine to leave, delete, or ignore.

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

- **Hash:** `75d059d`
- **Branch:** `main`
- **Repo:** https://github.com/Stan-31/extractly
