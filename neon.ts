import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    realtime: true,
  },
  aiGateway: true,
  functions: {
    hello: { name: "Hello World", source: "./functions/hello.ts" },
  },
  buckets: {
    assets: { access: "private" },
  },
});
