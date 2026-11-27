# Data fetching

**All application data fetching must start in a React Server Component.** This applies to database reads and external service reads. Server Components call server-only helpers directly and pass only the fields needed for rendering to Client Components.

- Never create a Route Handler to fetch application data, regardless of the HTTP method. Do not call an internal API from a Server Component or fetch data from a Client Component.
- Keep every database query in a server-only helper under the repository’s top-level `data/` directory. This includes reads, inserts, updates, and deletes. Use Drizzle ORM’s schema, query builder, and typed operators for every query.
- **Raw SQL is prohibited.** This includes SQL strings, Drizzle’s `sql` template and `sql.raw()`, and direct driver queries.
- Use Server Actions for mutations. Call the appropriate `data/` helper, then refresh or revalidate the affected view so its Server Component reads the updated data.

For example, the applications dashboard calls `listMyApplications()` from `data/applications.ts`. The helper gets the signed-in user’s ID from the server session, filters the Drizzle query by that owner, and returns only the fields the dashboard displays.
