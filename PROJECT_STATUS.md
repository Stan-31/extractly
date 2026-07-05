# Extractly — Project Status

## Completed Features

- [x] **Feature 1: Folder Structure** — Next.js 16 + Tailwind v4 + shadcn/ui (Nova preset) + Prisma 7 scaffold
- [x] **Feature 2: Database & Prisma** — `User`/`Upload`/`Invoice`/`Subscription` schema, migrated against Supabase Postgres (transaction pooler for the app, session pooler for migrations — see `prisma.config.ts`), plus a Postgres trigger that mirrors new Supabase Auth users into `public.users`.
- [x] **Feature 3: Auth guard** — `proxy.ts` + `lib/supabase/middleware.ts` refresh the Supabase session, redirect unauthenticated users away from `/dashboard`, redirect authenticated users away from `/login` + `/register`, and exchange the `?code=` param from Supabase email links (confirmation/magic-link) for a session. Real login/register forms wired to Supabase Auth; dashboard shows the signed-in user + sign-out.

## In Progress

- [ ] **Feature 4** — not yet started (upload flow is the next logical piece: `app/api/upload`, `react-dropzone`, Supabase Storage)

## Known Bugs

None currently. Worth knowing:
- This machine's network does TLS interception, so any server-side (Node) HTTPS fetch — Prisma CLI network calls, Supabase Admin/Auth calls from middleware, npm registry, `npx shadcn add` — fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` unless `NODE_OPTIONS=--use-system-ca` is set. This is now baked into the `dev`/`build`/`start` npm scripts via `cross-env`. If you add a new script or run Node directly, prefix it the same way.

## Next Milestone

Feature 4 — File upload: `react-dropzone` UI in `app/dashboard`, `app/api/upload/route.ts` storing files in Supabase Storage and creating an `Upload` row.

## Tech Stack Notes

- **Next.js 16** (Turbopack by default, `middleware.ts` renamed to `proxy.ts`)
- **Tailwind v4** (CSS-based config, no `tailwind.config.ts`)
- **shadcn/ui v4** (Nova preset — Lucide icons, Geist font)
- **Prisma 7** (config in `prisma.config.ts`, not in `schema.prisma` — `url`/`directUrl` datasource fields were removed in Prisma 7)
- **React 19**
- **Supabase Auth** — email/password via `@supabase/ssr`; email confirmation is enabled on the project, so new signups require clicking the confirmation email before `signInWithPassword` succeeds.

## Current Git Commit

- **Hash:** `043ab8b` (Features 2–3 not yet committed)
- **Branch:** `main`
- **Repo:** https://github.com/Stan-31/extractly
