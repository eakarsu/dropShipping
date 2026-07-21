import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", testTimeout: 15_000, hookTimeout: 30_000, fileParallelism: false },
});
