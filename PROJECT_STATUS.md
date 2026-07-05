# Extractly — Project Status

## Completed Features

- [x] **Feature 1: Folder Structure** — Next.js 16 + Tailwind v4 + shadcn/ui (Nova preset) + Prisma 7 scaffold
- [x] **Feature 2: Database & Prisma** — `User`/`Upload`/`Invoice`/`Subscription` schema, migrated against Supabase Postgres (transaction pooler for the app, session pooler for migrations — see `prisma.config.ts`), plus a Postgres trigger that mirrors new Supabase Auth users into `public.users`.
- [x] **Feature 3: Auth guard** — `proxy.ts` + `lib/supabase/middleware.ts` refresh the Supabase session, redirect unauthenticated users away from `/dashboard`, redirect authenticated users away from `/login` + `/register`, and exchange the `?code=` param from Supabase email links (confirmation/magic-link) for a session. Real login/register forms wired to Supabase Auth; dashboard shows the signed-in user + sign-out.
- [x] **Feature 4: Upload flow** — private `uploads` Supabase Storage bucket (10 MB limit, PDF/PNG/JPEG/WEBP only) with per-user folder RLS policies; `app/api/upload/route.ts` validates the file (Zod, `schemas/index.ts`), stores it under `${userId}/${uploadId}.${ext}`, and creates an `Upload` row (status `PENDING`). Dashboard has a drag-and-drop zone (`react-dropzone`) and a list of the user's uploads with status.

## In Progress

- [ ] **Feature 5** — not yet started. Uploads currently sit at `PENDING` forever — next up is OCR processing (`lib/ocr`, Mistral primary per the existing stub comment) to move them to `PROCESSING`/`COMPLETED`/`FAILED` and populate an `Invoice` row.

## Known Bugs

None currently. Worth knowing:
- This machine's network does TLS interception, so any server-side (Node) HTTPS fetch — Prisma CLI network calls, Supabase Admin/Auth calls from middleware, npm registry, `npx shadcn add` — fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` unless `NODE_OPTIONS=--use-system-ca` is set. This is now baked into the `dev`/`build`/`start` npm scripts via `cross-env`. If you add a new script or run Node directly, prefix it the same way.

## Next Milestone

Feature 5 — OCR: wire `lib/ocr/index.ts` (Mistral primary, per its stub comment) to pick up `PENDING` uploads, extract text, and create the corresponding `Invoice` row.

## Tech Stack Notes

- **Next.js 16** (Turbopack by default, `middleware.ts` renamed to `proxy.ts`)
- **Tailwind v4** (CSS-based config, no `tailwind.config.ts`)
- **shadcn/ui v4** (Nova preset — Lucide icons, Geist font)
- **Prisma 7** (config in `prisma.config.ts`, not in `schema.prisma` — `url`/`directUrl` datasource fields were removed in Prisma 7)
- **React 19**
- **Supabase Auth** — email/password via `@supabase/ssr`; email confirmation is enabled on the project, so new signups require clicking the confirmation email before `signInWithPassword` succeeds.

## Current Git Commit

- **Hash:** `80375f3`
- **Branch:** `main`
- **Repo:** https://github.com/Stan-31/extractly
