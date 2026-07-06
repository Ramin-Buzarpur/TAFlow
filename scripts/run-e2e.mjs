import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import net from "node:net";
import process from "node:process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const serverTimeoutMs = Number(process.env.E2E_SERVER_TIMEOUT_MS || 120_000);
const runTimeoutMs = Number(process.env.E2E_RUN_TIMEOUT_MS || 10 * 60_000);

function withHeap(existing) {
  if (existing?.includes("--max-old-space-size")) return existing;
  return [existing, "--max-old-space-size=6144"].filter(Boolean).join(" ");
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: root,
    stdio: options.stdio || "inherit",
    shell: false,
    detached: !isWindows,
    env: options.env || process.env
  });
}

function parseBaseUrl(url) {
  const parsed = new URL(url);
  return {
    port: Number(parsed.port || 3000)
  };
}

async function isPortFree(port, host = "127.0.0.1") {
  return await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickBaseUrl() {
  if (process.env.PLAYWRIGHT_BASE_URL) return process.env.PLAYWRIGHT_BASE_URL;
  for (let port = 3000; port <= 3010; port += 1) {
    if (await isPortFree(port)) return `http://localhost:${port}`;
  }
  return "http://localhost:3011";
}

async function waitForServer(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < serverTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`E2E server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl, { method: "GET" });
      if (response.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`E2E server did not become ready at ${baseUrl} within ${serverTimeoutMs}ms`);
}

async function buildApp() {
  fs.rmSync(path.join(root, ".next"), {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200
  });
  const child = spawnProcess("node", ["./node_modules/next/dist/bin/next", "build"], {
    env: {
      ...process.env,
      NODE_OPTIONS: withHeap(process.env.NODE_OPTIONS)
    }
  });

  return await new Promise((resolve, reject) => {
    child.once("exit", (code, signal) => {
      if (signal || (code ?? 1) !== 0) reject(new Error(`E2E build failed with code ${code ?? 1}`));
      else resolve();
    });
    child.once("error", reject);
  });
}

function terminate(child) {
  if (!child.pid || child.exitCode !== null) return Promise.resolve();
  if (isWindows) {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      killer.once("exit", () => resolve());
      killer.once("error", () => resolve());
    });
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      return Promise.resolve();
    }
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      resolve();
    }, 5000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function runPlaywright() {
  const args = ["./node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)];
  const child = spawnProcess("node", args, {
    env: {
      ...process.env,
      AUTH_URL: baseUrl,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_SKIP_WEB_SERVER: "1",
      NODE_OPTIONS: withHeap(process.env.NODE_OPTIONS)
    }
  });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error(`E2E run exceeded ${runTimeoutMs}ms and was stopped.`);
      terminate(child).then(() => resolve(1));
    }, runTimeoutMs);

    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal) resolve(1);
      else resolve(code ?? 1);
    });
    child.once("error", () => {
      clearTimeout(timeout);
      resolve(1);
    });
  });
}

const baseUrl = await pickBaseUrl();
const { port } = parseBaseUrl(baseUrl);

await buildApp();

const server = spawnProcess("node", ["./node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  env: {
    ...process.env,
    AUTH_URL: baseUrl,
    PORT: String(port),
    TAFLOW_E2E: "1",
    NODE_OPTIONS: withHeap(process.env.NODE_OPTIONS)
  }
});

let exitCode = 1;
try {
  await waitForServer(server);
  exitCode = await runPlaywright();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  await terminate(server);
}

process.exit(exitCode);
