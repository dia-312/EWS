import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

/**
 * End-to-end tests run against a LOCAL Supabase stack only (see e2e/auth.setup.ts,
 * which refuses to run against anything else). In CI that stack is started by
 * .github/workflows/ci.yml.
 *
 * Projects run in order: anonymous visitors first (they assert the pristine seed
 * data), then the signed-in admin specs, which create and clean up their own data.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // A broken build must fail fast instead of keeping CI busy until its own limit.
  globalTimeout: process.env.CI ? 15 * 60_000 : undefined,
  maxFailures: process.env.CI ? 12 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "anonymous",
      testMatch: /.*\.anon\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "admin",
      testMatch: /.*\.admin\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.auth/admin.json" },
      // These journeys change data; a retry would start from the half-changed state.
      retries: 0,
    },
    {
      // Talks to a second copy of the app that has the storefront cache switched on.
      name: "cache",
      testMatch: /.*\.cache\.spec\.ts/,
      dependencies: ["setup"],
      use: { baseURL: process.env.CACHE_BASE_URL ?? "http://localhost:3001" },
    },
  ],
});
