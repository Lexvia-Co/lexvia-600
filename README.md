# Lexvia 600

Run npm, Git, and Neon commands from this directory. The Next.js routes and pages live in `app/`. Clerk handles sign-in through `proxy.ts` and the root layout. Neon clients live in `lib/neon/`, deployable handlers in `functions/`, and database changes in `migrations/`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Neon backend

Run the following from this directory after linking the intended Neon branch. `neon deploy` applies the services declared in `neon.ts` and pulls their credentials into the local environment file. Clerk handles user authentication.

```sh
neon deploy
npm run neon:migrate
npm run build
npm run neon:verify
```

The migration creates the table used to observe committed changes over Realtime. The verification command starts the production build on a temporary loopback port, runs all five checks through `POST /api/neon/check`, and exits with a failing status if any service fails. It uses a random token for that process. The checks make one embedding request, invoke the `hello` function, query Postgres, and round-trip a temporary object and a Realtime row.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
