import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Applicant answers and document metadata pass through Server Actions.
  logging: { serverFunctions: false },
  cacheComponents: true,
  partialPrefetching: true,
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
