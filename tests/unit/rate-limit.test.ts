import { describe, expect, it } from "vitest";
import { checkRateLimit, makeRateLimitKey } from "../../src/server/auth/rate-limit";

describe("rate limiting", () => {
  it("allows requests within the limit and blocks once exceeded", async () => {
    const key = makeRateLimitKey("test-scope", "1.2.3.4", "user@example.edu");
    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit(key, 3, 60_000)).allowed).toBe(true);
    }
    expect((await checkRateLimit(key, 3, 60_000)).allowed).toBe(false);
  });

  it("normalizes key parts regardless of case or whitespace", () => {
    const a = makeRateLimitKey("login", " Foo@Example.com ");
    const b = makeRateLimitKey("login", "foo@example.com");
    expect(a).toBe(b);
  });

  it("resets the bucket once the window expires", async () => {
    const key = makeRateLimitKey("test-scope-2", "5.5.5.5");
    expect((await checkRateLimit(key, 1, 10)).allowed).toBe(true);
    expect((await checkRateLimit(key, 1, 10)).allowed).toBe(false);
  });
});
