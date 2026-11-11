import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "@dados": path.resolve(import.meta.dirname, "dados") } },
  test: { include: ["tests/**/*.test.ts"] },
});
