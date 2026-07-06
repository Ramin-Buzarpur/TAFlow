import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { clearRateLimitState } from "../clear-rate-limit-state";

const PASSWORD = "Admin@12345678";
type AccountFile = "admin" | "professor" | "headta" | "student";

const ACCOUNTS: Array<{ email: string; file: AccountFile }> = [
  { email: "admin@example.edu", file: "admin" },
  { email: "rezai@example.edu", file: "professor" },
  { email: "headta@example.edu", file: "headta" },
  { email: "student@example.edu", file: "student" }
];

export const AUTH_DIR = path.join(process.cwd(), "tests/e2e/.auth");

export function authFile(name: "admin" | "professor" | "headta" | "student") {
  return path.join(AUTH_DIR, `${name}.json`);
}

async function loginAndStoreState(baseURL: string, account: { email: string; file: AccountFile }) {
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/");
  const result = await page.evaluate(async ({ email, password }) => {
    const csrfResponse = await fetch("/api/auth/csrf", { credentials: "include" });
    const csrfData = (await csrfResponse.json()) as { csrfToken: string };
    const body = new URLSearchParams();
    body.set("csrfToken", csrfData.csrfToken);
    body.set("email", email);
    body.set("password", password);
    body.set("callbackUrl", "/dashboard");
    const response = await fetch("/api/auth/callback/credentials?redirect=false", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      credentials: "include",
      body
    });
    return {
      status: response.status,
      redirected: response.redirected,
      url: response.url
    };
  }, { email: account.email, password: PASSWORD });

  if (result.status >= 400 || !result.redirected || !result.url.includes("/dashboard")) {
    await browser.close();
    throw new Error(`Failed to create auth state for ${account.email}`);
  }

  await context.storageState({ path: authFile(account.file) });
  await context.close();
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  await clearRateLimitState();
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const baseURL = (config.projects[0]?.use?.baseURL as string) || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  const accounts = process.env.AUTH_ENFORCE_2FA_FOR_STAFF === "true"
    ? ACCOUNTS.filter((account) => account.file === "student" || account.file === "headta")
    : ACCOUNTS;

  for (const account of accounts) {
    await loginAndStoreState(baseURL, account);
  }
}
