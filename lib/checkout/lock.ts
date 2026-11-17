// lib/checkout/lock.ts
//
// A short-lived lock so the browser's payment confirmation and Razorpay's webhook
// can't create the same order twice at the same moment.
//
// Uses the shared Redis store (Upstash / Vercel KV REST API) when configured, so the
// lock holds across server instances. Without it, the lock holds within one instance.

const LOCK_TTL_SECONDS = 60;
const memoryLocks = new Map<string, number>();

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(cfg: { url: string; token: string }, command: string[]) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Lock store returned ${res.status}`);
  return (await res.json()) as { result?: unknown };
}

async function tryAcquire(key: string, owner: string): Promise<boolean> {
  const cfg = redisConfig();
  if (cfg) {
    const { result } = await redis(cfg, ['SET', `lock:${key}`, owner, 'NX', 'EX', String(LOCK_TTL_SECONDS)]);
    return result === 'OK';
  }
  const now = Date.now();
  const expires = memoryLocks.get(key);
  if (expires && expires > now) return false;
  memoryLocks.set(key, now + LOCK_TTL_SECONDS * 1000);
  return true;
}

async function release(key: string, owner: string) {
  const cfg = redisConfig();
  if (cfg) {
    // Only delete the lock if we still own it.
    const { result } = await redis(cfg, ['GET', `lock:${key}`]);
    if (result === owner) await redis(cfg, ['DEL', `lock:${key}`]);
    return;
  }
  memoryLocks.delete(key);
}

export class LockBusyError extends Error {
  constructor() {
    super('Another request is processing this payment');
  }
}

/**
 * Runs `fn` while holding the lock for `key`. If another request holds it, waits for
 * it (the other request will usually have created the order by then) and retries.
 */
export async function withLock<T>(key: string, fn: () => Promise<T>, maxWaitMs = 15000): Promise<T> {
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + maxWaitMs;
  while (!(await tryAcquire(key, owner))) {
    if (Date.now() > deadline) throw new LockBusyError();
    await new Promise((r) => setTimeout(r, 500));
  }
  try {
    return await fn();
  } finally {
    await release(key, owner).catch(() => {});
  }
}
