# Repository Guidelines

## Project Structure

The repository root contains the Next.js app, npm manifest, and Neon configuration. Edit `app/page.tsx` for the home page and `app/layout.tsx` for shared layout and Clerk controls. Keep global styles in `app/globals.css` and serve static files from `public/`. Clerk middleware lives in `proxy.ts`.

Keep server-side Neon clients in `lib/neon/`, deployable handlers in `functions/`, and SQL migrations in `migrations/`. When moving a deployed handler, update its `source` path in `neon.ts`. Keep credentials in the Git-ignored `.env.local`.

Follow the [data-fetching policy](docs/data-fetching.md) for all application reads and database operations.

## Development Commands

Run these commands from the repository root.

- `npm ci` installs the locked dependency versions.
- `npm run dev` starts the local development server on port 3000.
- `npm run lint` checks the application with ESLint.
- `npm run build` produces the production build. Use `npm start` to serve it.

## Coding Style and Naming

Use strict TypeScript, two-space indentation, and double-quoted strings. Use PascalCase for React components and camelCase for local variables. Follow App Router filenames such as `page.tsx` and `route.ts`. The `@/*` alias resolves from the repository root.

## UI and Web Design

Follow the [UI component policy](docs/ui.md) whenever a task involves a UI component decision, including during planning and review.

Before writing or changing UI or web design code, read and use both repository skills. This applies to pages, components, styling, responsive layouts, accessibility, and browser interactions.

1. Start with [Google’s Modern Web Guidance](.agents/skills/modern-web-guidance/SKILL.md). Search for the web platform feature or UI pattern and apply the relevant guidance.
2. Use the [shadcn/ui skill](.agents/skills/shadcn/SKILL.md) to check existing components and follow the project’s composition and styling conventions.

## Testing

Run lint and the production build. Exercise changed routes in a browser and check responsive or theme changes at narrow and wide widths in light and dark mode. Run `npm run neon:verify` from the command line to test the configured Neon branch. The check performs live service calls and writes temporary test data.

## Commits and Pull Requests

Use a short, imperative commit subject such as `Add sign-in link to home page`. Describe the behavior change and verification in the pull request, link any related issue, and include screenshots for visible changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
