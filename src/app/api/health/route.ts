import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  const startedAt = performance.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "ok",
      latencyMs: Math.round(performance.now() - startedAt),
      time: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      database: "error",
      latencyMs: Math.round(performance.now() - startedAt),
      time: new Date().toISOString()
    }, { status: 503 });
  }
}
