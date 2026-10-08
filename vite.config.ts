import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Cross-origin isolation lets onnxruntime-web use multiple threads (SharedArrayBuffer).
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react()],
  server: { headers: isolation, port: 5199, strictPort: true },
  preview: { headers: isolation, port: 5199 },
  worker: { format: "es" },
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  test: { testTimeout: 60_000 },
});
