import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  test: {
    // Two environments: server code needs real Node (pg sockets), components need
    // a DOM. Splitting them keeps jsdom out of the DB tests and vice versa.
    projects: [
      {
        resolve: { alias },
        test: {
          name: "server",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          setupFiles: ["./tests/setup.ts"],
          // These talk to a real Postgres over the network, so the default 5s is tight.
          testTimeout: 30_000,
          hookTimeout: 30_000,
          // Suites share DB fixtures; running files in parallel makes them race.
          fileParallelism: false,
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["./tests/setup-components.ts"],
        },
      },
    ],
  },
});
