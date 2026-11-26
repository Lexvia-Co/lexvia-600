# Data mutations

**Every application mutation must enter through a Next.js Server Action. Every database write must go through a server-only Drizzle helper in the repository’s top-level `data/` directory.**

## Server Actions

- Co-locate each action with the route or feature that uses it in a file named `actions.ts`, such as `app/applications/[id]/actions.ts`. Put `"use server";` at the top of the file and export actions as async functions.
- Give **every parameter** an explicit TypeScript type. Use a typed primitive or a named input object with only the fields the caller may change. **Never pass or accept `FormData`**, including for file uploads. A form should construct the typed payload from its fields before invoking the action.
- Validate incoming values at runtime and obtain the caller’s identity from the server session. Pass the verified identity and validated input to the mutation helper. After a successful write, refresh or revalidate the affected view so its Server Component reads the saved state.

## Database helpers

- Keep inserts, updates, and deletes in `data/` modules marked with `import "server-only"`. Use Drizzle’s schema, query builder, and typed operators for every database call. Raw SQL and direct driver queries are prohibited.
- Scope each applicant-owned write to the authenticated owner. For updates and deletes, include the owner and record ID in the write condition. Use a Drizzle transaction when multiple writes must succeed together.

For example, a trip form can call `saveTripPurpose(applicationId: string, purpose: string)` in its co-located `actions.ts`. The action validates both values, resolves the signed-in applicant, and calls a helper in `data/applications.ts` to update that applicant’s draft. The page then reads the saved trip purpose according to the [data-fetching policy](./data-fetching.md).
