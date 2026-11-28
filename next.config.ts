import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Applicant answers and document metadata pass through Server Actions.
  logging: { serverFunctions: false },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    "/applications/**": [
      "./lib/workspace/pdf-inspection-worker.mjs",
      "./node_modules/pdf-lib/package.json",
      "./node_modules/pdf-lib/dist/pdf-lib.min.js",
    ],
  },
  turbopack: {
    rules: {
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
