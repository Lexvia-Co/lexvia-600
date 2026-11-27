import { defineConfig, type FunctionBundler } from "@neon/config/v1";

const bundleCleanup: FunctionBundler = async ({ source }) => {
  const { build } = await import("esbuild");
  const result = await build({
    entryPoints: [source], outfile: "index.mjs", bundle: true, write: false,
    platform: "node", target: "node24", format: "esm",
    // Share the same server-only Drizzle helpers with the standalone Neon runtime.
    conditions: ["react-server"],
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  });
  return { "index.mjs": result.outputFiles[0].contents };
};

export default defineConfig({
  preview: {
    realtime: true,
  },
  aiGateway: true,
  functions: {
    hello: { name: "Hello World", source: "./functions/hello.ts" },
    cleanup: {
      name: "Remove expired drafts and private files",
      source: "./functions/cleanup.ts",
      bundler: bundleCleanup,
    },
  },
  triggers: {
    "workspace-retention": { type: "schedule", function: "cleanup", cron: "*/15 * * * *" },
  },
  buckets: {
    assets: { access: "private" },
  },
});
