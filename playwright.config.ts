import { defineConfig, devices } from "@playwright/test";

function withE2eHeapLimit(existing: string | undefined) {
  if (existing?.includes("--max-old-space-size")) return existing;
  return [existing, "--max-old-space-size=6144"].filter(Boolean).join(" ");
}

const webServerEnv = {
  ...process.env,
  NODE_OPTIONS: withE2eHeapLimit(process.env.NODE_OPTIONS)
};

const webServer =
  process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1"
    ? undefined
    : {
        command: "node ./node_modules/next/dist/bin/next dev",
        env: webServerEnv,
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      };

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Turbopack's dev server compiles routes on demand in a single process; running many
  // workers in parallel against it causes concurrent first-compiles to stall and time out.
  // Single worker keeps runs reliable locally and in CI.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "msedge" } }
  ],
  webServer
});
