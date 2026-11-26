# Lexvia 600

Lexvia 600 is a Next.js App Router project with Clerk authentication and a Neon Postgres backend.

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

## Neon setup and verification

After linking the intended Neon branch, deploy its services, apply the schema migrations, build the app, and verify the services.

```sh
neon deploy
npm run neon:migrate
npm run build
npm run neon:verify
```

The verifier runs from the command line. It queries Postgres, invokes the `hello` function, requests an embedding, and tests Object Storage and Realtime with temporary data. A failed service check gives the command a nonzero exit status.

To exercise the sample user CRUD flow against a migrated development database, run `npm run db:demo`.
