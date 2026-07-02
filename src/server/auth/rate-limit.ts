import "server-only";
import Redis from "ioredis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

type Bucket = {
  count: number;
  resetAt: number;
};

// In-memory fallback: used when REDIS_URL is unset (unit tests, or a
// single-instance dev box without Redis running). Not safe across multiple
// app instances or restarts, which is exactly why Redis is preferred when
// available.
const memoryBuckets = new Map<string, Bucket>();

function checkRateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt: new Date(resetAt) };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.resetAt) };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(limit - existing.count, 0), resetAt: new Date(existing.resetAt) };
}

const globalForRedis = globalThis as unknown as { rateLimitRedis?: Redis | null };

function getRedisClient(): Redis | null {
  if (globalForRedis.rateLimitRedis !== undefined) return globalForRedis.rateLimitRedis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.rateLimitRedis = null;
    return null;
  }
  const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: false, retryStrategy: () => null });
  client.on("error", () => {
    // Swallow connection errors; checkRateLimit falls back to in-memory below.
  });
  globalForRedis.rateLimitRedis = client;
  return client;
}

// Atomic INCR + set-expiry-only-on-first-hit, so a burst of concurrent
// requests in the same window can't each reset the TTL.
const INCR_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { count, ttl }
`;

async function checkRateLimitRedis(client: Redis, key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const [count, ttl] = (await client.eval(INCR_SCRIPT, 1, redisKey, windowMs)) as [number, number];
  const resetAt = new Date(Date.now() + (ttl > 0 ? ttl : windowMs));
  if (count > limit) return { allowed: false, remaining: 0, resetAt };
  return { allowed: true, remaining: Math.max(limit - count, 0), resetAt };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = getRedisClient();
  if (!client) return checkRateLimitInMemory(key, limit, windowMs);
  try {
    return await checkRateLimitRedis(client, key, limit, windowMs);
  } catch {
    // Redis unreachable mid-request: fail open to the in-memory limiter
    // rather than blocking the whole request pipeline on an outage.
    return checkRateLimitInMemory(key, limit, windowMs);
  }
}

export function makeRateLimitKey(scope: string, ...parts: Array<string | null | undefined>): string {
  return [scope, ...parts.map((part) => part?.trim().toLowerCase() || "unknown")].join(":");
}

// Returns null when REDIS_URL isn't configured (in-memory fallback is active
// by design, not a failure), true/false when it is configured and reachable/not.
export async function checkRedisHealth(): Promise<boolean | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
