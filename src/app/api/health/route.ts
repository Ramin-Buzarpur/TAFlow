import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { checkRedisHealth } from "@/server/auth/rate-limit";
import { checkStorageHealth } from "@/server/storage/s3";

async function checkDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const startedAt = performance.now();
  // Each dependency is checked independently so one being down doesn't throw
  // away the status of the others.
  const [databaseOk, redisOk, storageOk] = await Promise.all([checkDatabase(), checkRedisHealth(), checkStorageHealth()]);

  const database = databaseOk ? "ok" : "error";
  const redis = redisOk === null ? "not_configured" : redisOk ? "ok" : "error";
  const storage = storageOk ? "ok" : "error";

  // Redis being unconfigured is fine (in-memory rate limiting fallback is
  // intentional); Redis or storage being unreachable when configured is not.
  const healthy = databaseOk && redisOk !== false && storageOk;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      redis,
      storage,
      latencyMs: Math.round(performance.now() - startedAt),
      time: new Date().toISOString()
    },
    { status: healthy ? 200 : 503 }
  );
}
