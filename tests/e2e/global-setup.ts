import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

const PASSWORD = "Admin@12345678";
const ACCOUNTS = [
  { email: "admin@example.edu", file: "admin" },
  { email: "rezai@example.edu", file: "professor" },
  { email: "headta@example.edu", file: "headta" },
  { email: "student@example.edu", file: "student" }
];

export const AUTH_DIR = path.join(process.cwd(), "tests/e2e/.auth");

export function authFile(name: "admin" | "professor" | "headta" | "student") {
  return path.join(AUTH_DIR, `${name}.json`);
}

export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const baseURL = (config.projects[0]?.use?.baseURL as string) || "http://localhost:3000";
  const browser = await chromium.launch({ channel: "msedge" });

  for (const account of ACCOUNTS) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByPlaceholder("ایمیل").fill(account.email);
    await page.getByPlaceholder("رمز عبور").fill(PASSWORD);
    await page.getByRole("button", { name: "ورود" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await context.storageState({ path: authFile(account.file as "admin") });
    await context.close();
  }

  await browser.close();
}
