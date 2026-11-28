import "server-only";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type { FileInspection } from "./document-checks";

export async function inspectPdf(bytes: Uint8Array): Promise<FileInspection> {
  // Keep parsing work off the request thread. A compressed PDF can require
  // substantially more memory and CPU than its upload size suggests.
  const worker = new Worker(join(process.cwd(), "lib/workspace/pdf-inspection-worker.mjs"), {
    // Next adds worker globals to this object. Keep the typed array nested so its bytes survive cloning.
    workerData: { bytes },
    execArgv: [],
    stderr: true,
    resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
  });
  // The parser can warn about values read from private applicant documents.
  worker.stderr.resume();
  try {
    return await new Promise<FileInspection>((resolve, reject) => {
      const timeout = setTimeout(() => resolve("unreadable"), 5_000);
      worker.once("message", resolve);
      worker.once("error", error => {
        if ((error as NodeJS.ErrnoException).code === "ERR_WORKER_OUT_OF_MEMORY") resolve("unreadable");
        else reject(error);
      });
      worker.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("PDF inspection worker exited without a result"));
      });
    });
  } finally {
    await worker.terminate();
  }
}
