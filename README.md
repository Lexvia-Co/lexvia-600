# VBER

**VBER is a Mandarin workspace for adults in mainland China preparing their own Australian Visitor visa (subclass 600), Tourist stream application.** Applicants can resume drafts across devices, prepare evidence and editable letters, and review their work before lodging in ImmiAccount.

The app uses the Next.js App Router, Clerk authentication, and a Neon Postgres backend.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/`, `components/ui/` | Next.js pages and layouts, global styles, and shared shadcn/ui components. |
| `proxy.ts` | Clerk middleware for incoming requests. |
| `public/` | Static assets served by Next.js. |
| `data/`, `lib/neon/` | Server-only Drizzle query helpers, the database connection, and helpers for the Neon service checks. |
| `functions/`, `neon.ts` | Neon function handlers and the configuration for deploying functions and other Neon services. |
| `src/db/schema.ts`, `drizzle.config.ts` | Drizzle definitions for the demo users and Realtime probe tables, and Drizzle Kit configuration. |
| `src/index.ts` | Standalone Drizzle example that creates, reads, updates, and deletes a sample user. |
| `migrations/`, `scripts/` | Versioned Drizzle migrations and the command-line Neon verifier. |

## Local development

Run these commands from the repository root with your Clerk and Neon credentials in `.env.local`.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Edit `app/page.tsx` to change the home page.

## Workspace verification

Run `npm test` for checklist, template, file validation, and cleanup-handler tests. To test database migrations, owner isolation, conflicting saves, quotas, and expiry, set `TEST_DATABASE_URL` to a dedicated disposable PostgreSQL database and run `npm run db:test`. The suite applies migrations and exercises retention cleanup on that database. For local production browser checks, run `npm run build` then `npm start -- -H localhost` and open the matching localhost URL.

## Workspace deployment

Apply versioned migrations on the intended Neon branch and deploy the private `assets` bucket, cleanup function, and its 15-minute schedule using the commands below. The Next.js app and cleanup worker both need database and bucket credentials for that same branch. The private staging endpoint must accept signed PUT requests from the deployed app origin. Verify upload, download, and cleanup with synthetic documents after deployment. The workspace enforces 90 days of inactivity, 10 MiB per file, and up to 40 files or 100 MiB per draft. See the [delivery plan and mainland release checks](docs/mvp-plan.md).

## Neon setup and verification

After linking the intended Neon branch, deploy its services, apply the schema migrations, build the app, and verify the services.

```sh
npm run neon:migrate
neon deploy
npm run build
npm run neon:verify
```

The verifier runs from the command line. It queries Postgres, invokes the `hello` function, requests an embedding, and tests Object Storage and Realtime with temporary data. A failed service check gives the command a nonzero exit status.

To exercise the sample user CRUD flow against a migrated development database, run `npm run db:demo`.
