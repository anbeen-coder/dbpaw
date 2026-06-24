import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test-d.ts"],
    typecheck: {
      include: ["src/**/*.test-d.ts"],
    },
  },
});
