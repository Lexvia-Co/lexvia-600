# VBER

VBER is a Mandarin workspace for adults in mainland China preparing their own Australian Visitor visa (subclass 600), Tourist stream application from outside Australia. Applicants can resume a private draft across devices, organise supporting evidence, and print a preparation summary. They enter their answers, upload files, pay, and lodge the application in their own ImmiAccount.

## Applicant workflow

1. Visit `/guide` for a public scope check covering age, location, and reason for travel. The guide links to Home Affairs guidance for people outside the workspace’s scope.
2. Sign in at `/sign-in` or register at `/sign-up`. The dashboard at `/applications` lets applicants create, resume, and delete drafts.
3. Each draft moves through identity, visit, funding, evidence, templates, review, and aftercare. The evidence checklist adapts to the trip purpose and who pays. Applicants can attach originals with their English translations and edit an English itinerary, invitation letter, or employment and leave letter.
4. Review highlights answers that need attention and links back to the relevant fields. Applicants can print the summary, open ImmiAccount, and return to the draft for post-lodgement guidance.

Drafts expire after 90 days of inactivity. Resuming a draft or saving a change renews that period. Evidence uploads accept PDF, JPEG, and PNG, up to 10 MiB per file. Each draft can hold up to 40 files totalling up to 100 MiB.

## Local development

Use Node.js 22.12 or later on the 22.x line, or Node.js 24, with npm. From the repository root, run `npm ci`. Put credentials for your development services in the Git-ignored `.env.local`.

| Feature | Environment variables |
| --- | --- |
| Clerk sign-in | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the same Clerk application |
| Drafts in Postgres | `DATABASE_URL`. For migrations, Drizzle Kit prefers `DATABASE_URL_UNPOOLED` when set. Point both URLs at the same development database. |
| Private evidence files | `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` for the branch’s private `assets` bucket. The workspace also accepts `AWS_SESSION_TOKEN` for temporary credentials. |

Apply the versioned migrations to the development database, then start Next.js.

```sh
npm run neon:migrate
npm run dev
```

Open the [local guide](http://localhost:3000/guide) or sign in to the [draft dashboard](http://localhost:3000/applications). To serve a local production build, run `npm run build` followed by `npm start`.

## Repository map

| Path | What lives here |
| --- | --- |
| `app/`, `proxy.ts` | Next.js App Router pages, Clerk middleware, and the Server Actions that save drafts and manage uploads. |
| `components/workspace/`, `components/ui/` | Draft editor, evidence checklist, letter templates, review screen, and shared shadcn/ui controls. |
| `lib/workspace/` | Step definitions, validation, checklist rules, letter generation, file policies, and signed storage requests. |
| `data/`, `lib/neon/` | Server-only Drizzle queries scoped to the signed-in owner, revision checks for concurrent saves, file reservations and cleanup, database connection, and service checks. |
| `src/db/schema.ts`, `migrations/` | Drizzle schema and versioned SQL for applications, applicant details, evidence items, document metadata, the cleanup queue, and the demo and diagnostic tables. |
| `neon.ts`, `functions/` | Neon service definitions and handlers for the scheduled cleanup worker and the `hello` diagnostic. |

For repository conventions, see the [data fetching](docs/data-fetching.md), [data mutation](docs/data-mutations.md), and [UI](docs/ui.md) guides.

## Verification

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint across the repository. |
| `npm test` | Local tests for the workspace model, templates, file validation, and cleanup handler. |
| `npm run db:test` | Integration tests for migrations, owner isolation, conflicting saves, upload quotas, and expiry. Export `TEST_DATABASE_URL` in the shell first. Use a disposable PostgreSQL database because the suite applies migrations and runs retention cleanup. |
| `npm run build` | Next.js production compilation and TypeScript checks. |
| `npm run neon:verify` | Live Postgres, Object Storage, Functions, Realtime, and AI Gateway checks. The verifier writes and removes a temporary object and database row, requests an embedding, and exits nonzero if any service fails. |

The live verifier also needs `NEON_BRANCH_ID` and `NEON_FUNCTION_HOST_SUFFIX` for the deployed function, `NEON_REALTIME_URL` and `NEON_REALTIME_SECRET` for Realtime, and `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN` for embeddings. To exercise the separate sample user CRUD flow on a migrated development database, run `npm run db:demo`.

## Deploying Neon services

Link the Neon CLI to the intended branch and point the migration connection at that branch. Run `npm run neon:migrate`, then `neon deploy` to apply [the service configuration](neon.ts). It declares the private `assets` bucket, the `hello` and `cleanup` functions, and a cleanup schedule that runs every 15 minutes.

Configure the Next.js app and cleanup worker with database and storage credentials for the same branch. The browser uploads directly to private staging storage using a signed PUT, so the storage endpoint must allow requests from the app’s origin. After deployment, use a synthetic document to check upload and download through the workspace.
