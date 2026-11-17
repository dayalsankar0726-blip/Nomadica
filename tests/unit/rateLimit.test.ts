import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, rateLimit, MAX_REQUESTS_PER_WINDOW } from "@/lib/rate-limit/sharedLimiter";
import { TokenBucketLimiter } from "@/lib/rate-limit/tokenBucket";

describe("getClientIp", () => {
  it("prefers the platform header Vercel sets", () => {
    const h = new Headers({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" });
    expect(getClientIp(h)).toBe("1.1.1.1");
  });

  it("uses only the first x-forwarded-for entry", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
  });

  it("falls back to a fixed key when no header is present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("TokenBucketLimiter", () => {
  it("blocks once the bucket is empty", () => {
    const limiter = new TokenBucketLimiter(3, 0.001);
    expect([1, 2, 3].map(() => limiter.limit("ip").allowed)).toEqual([true, true, true]);
    expect(limiter.limit("ip").allowed).toBe(false);
    expect(limiter.limit("other-ip").allowed).toBe(true);
  });
});

describe("rateLimit with a shared store", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("counts requests in Redis and blocks over the limit", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ result: MAX_REQUESTS_PER_WINDOW + 1 }, { result: 1 }]))
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await rateLimit("4.4.4.4");
    expect(result.allowed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith("https://redis.example/pipeline", expect.anything());
  });

  it("falls back to in-memory limits if the store is down", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect((await rateLimit("5.5.5.5")).allowed).toBe(true);
  });
});
