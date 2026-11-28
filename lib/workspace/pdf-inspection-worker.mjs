import { parentPort, workerData } from "node:worker_threads";
import pdf from "pdf-lib/dist/pdf-lib.min.js";

async function inspect(bytes) {
  try {
    const document = await pdf.PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    // Encrypted object streams can be unreadable before we reach the
    // trailer. Inspect its encryption entry before checking page structure.
    if (document.context.trailerInfo.Encrypt) return "secured";
    if (document.context.enumerateIndirectObjects().some(([, object]) => object instanceof pdf.PDFInvalidObject)) {
      return "unreadable";
    }
    const pages = document.getPages();
    const readable = pages.length > 0 && pages.every(page => {
      const { width, height } = page.getSize();
      if (!(width > 0 && height > 0)) return false;
      const contents = page.node.get(pdf.PDFName.of("Contents"));
      if (!contents) return true; // PDF permits blank pages.
      const value = document.context.lookup(contents);
      if (value instanceof pdf.PDFArray) {
        return value.asArray().every(item => document.context.lookup(item) instanceof pdf.PDFStream);
      }
      return value instanceof pdf.PDFStream;
    });
    return readable ? "clear" : "unreadable";
  } catch {
    return "unreadable";
  }
}

parentPort.postMessage(await inspect(workerData.bytes));
