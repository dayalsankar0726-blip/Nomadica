// lib/rate-limit/sharedLimiter.ts
//
// Rate limiting that holds across all server instances.
//
// When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (Upstash Redis, or
// Vercel KV which exposes the same REST API as KV_REST_API_URL / KV_REST_API_TOKEN),
// counts are kept in Redis with a fixed one-minute window per client IP. Without them,
// it falls back to the in-memory token bucket, which only limits per instance.
import { limiter as memoryLimiter } from './tokenBucket';

export const WINDOW_SECONDS = 60;
export const MAX_REQUESTS_PER_WINDOW = 600; // ~10 requests/second on average per IP

export interface LimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * The client's IP address. On Vercel, `x-vercel-forwarded-for` and `x-real-ip` are set by
 * the platform and can't be spoofed; `x-forwarded-for` is only trusted for its first entry,
 * which Vercel also overwrites.
 */
export function getClientIp(headers: Headers): string {
  const vercel = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercel) return vercel;
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function limitWithRedis(key: string, cfg: { url: string; token: string }): Promise<LimitResult> {
  const windowId = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const redisKey = `ratelimit:${key}:${windowId}`;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, String(WINDOW_SECONDS * 2)],
    ]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Rate limit store returned ${res.status}`);
  const [incr] = (await res.json()) as Array<{ result?: number; error?: string }>;
  if (typeof incr?.result !== 'number') throw new Error(incr?.error || 'Bad rate limit response');

  const count = incr.result;
  const secondsLeft = WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS);
  return {
    allowed: count <= MAX_REQUESTS_PER_WINDOW,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - count),
    retryAfterSeconds: secondsLeft,
  };
}

function limitInMemory(key: string): LimitResult {
  if (Math.random() < 0.05) memoryLimiter.cleanup();
  const r = memoryLimiter.limit(key);
  return { ...r, retryAfterSeconds: 1 };
}

export async function rateLimit(key: string): Promise<LimitResult> {
  const cfg = redisConfig();
  if (!cfg) return limitInMemory(key);
  try {
    return await limitWithRedis(key, cfg);
  } catch (error) {
    // If the shared store is down, keep serving and fall back to per-instance limits.
    console.error('[rate-limit] shared store unavailable:', error instanceof Error ? error.message : error);
    return limitInMemory(key);
  }
}
