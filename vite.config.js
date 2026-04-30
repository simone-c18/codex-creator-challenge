import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "pdfjs-dist/build/pdf.worker.entry": fileURLToPath(
        new URL("./src/utils/pdfWorkerEntry.js", import.meta.url),
      ),
    },
  },
});
