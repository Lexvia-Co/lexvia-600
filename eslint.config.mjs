import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["{app,components,data,functions,lib,scripts,src}/**/*.{js,mjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "drizzle-orm", importNames: ["sql"], message: "Use the typed Drizzle query builder in data/." },
          { name: "@neon/realtime/server", importNames: ["rawSql"], message: "Subscribe to a Drizzle-built query." },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
