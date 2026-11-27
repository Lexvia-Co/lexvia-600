import { config } from "dotenv";
import { runUserDemo } from "../data/user-demo";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { user, updated } = await runUserDemo();
  console.log("Created and read sample user", user);
  console.log("Updated sample user", updated);
  console.log("Deleted sample user.");
}

main().catch((error: Error) => {
  console.error("User demo failed", error.name);
  process.exitCode = 1;
});
