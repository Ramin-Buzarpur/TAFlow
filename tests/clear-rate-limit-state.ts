import Redis from "ioredis";

export async function clearRateLimitState(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) return;

  const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false, retryStrategy: () => null });

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", "ratelimit:*", "COUNT", 500);
      cursor = nextCursor;
      if (keys.length) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  } finally {
    await client.quit().catch(() => undefined);
  }
}
