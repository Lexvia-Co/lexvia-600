# Lexvia 600

Lexvia 600 is a Next.js App Router project with Clerk authentication and a Neon Postgres backend.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Home page, root layout with Clerk controls, global styles, and the `/api/neon/check` diagnostic route. |
| `proxy.ts` | Clerk middleware for incoming requests. |
| `public/` | Static assets served by Next.js. |
| `lib/neon/` | Server-side database client and Neon service checks. |
| `functions/`, `neon.ts` | Neon function handlers and the configuration for deploying functions and other Neon services. |
| `src/db/schema.ts`, `drizzle.config.ts` | The Drizzle `users` table definition and the configuration for Drizzle Kit. |
| `src/index.ts` | Standalone Drizzle example that creates, reads, updates, and deletes a sample user. |
| `migrations/`, `scripts/` | SQL for the Realtime probe table and scripts to apply the migration and verify Neon services. |

## Local development

Run these commands from the repository root with your Clerk and Neon credentials in `.env.local`.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Edit `app/page.tsx` to change the home page.

## Neon setup and verification

After linking the intended Neon branch, deploy its services, apply the Realtime probe migration, and verify the production build.

```sh
neon deploy
npm run neon:migrate
npm run build
npm run neon:verify
```

The verifier calls `POST /api/neon/check` on a temporary local server. It queries Postgres, invokes the `hello` function, requests an embedding, and tests Object Storage and Realtime with temporary data.
