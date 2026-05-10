import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
  test: {
    include: ["tests/lib/**/*.test.ts", "tests/components/**/*.test.ts"],
    testTimeout: 600_000, // E2E mint runs against devnet (~30s wall + proof gen)
    hookTimeout: 600_000,
    environment: "node",
    setupFiles: ["tests/lib/setup.ts"],
  },
});
