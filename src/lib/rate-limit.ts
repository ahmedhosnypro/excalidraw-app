import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter (sliding-window, per key).
 *
 * No external dependencies — suitable for a single-server self-hosted deployment.
 * For multi-instance deployments later, swap this for a Redis-backed limiter;
 * the public API (`rateLimit`) stays the same.
 *
 * Entries expire after the window, so memory grows with active clients only.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Periodically prune expired buckets to keep memory bounded. */
const PRUNE_INTERVAL = 60_000;
let lastPrune = Date.now();

function prune(): void {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL) {
    return;
  }
  lastPrune = now;
  const expired: string[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      expired.push(key);
    }
  }
  for (const key of expired) {
    buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Maximum requests per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check the rate limit for a key. Returns `{ ok, remaining, resetAt }`.
 * Mutates the bucket (increments the count) when the request is allowed.
 * Pure check (no increment) when `ok` is false — the caller rejects the request.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  prune();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const bucket: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: opts.limit - 1, resetAt: bucket.resetAt };
  }

  if (existing.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, resetAt: existing.resetAt };
}

/** Standard 429 response with Retry-After header (seconds, minimum 1). */
export function rateLimited(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Extract a client key for rate limiting: authenticated user id, or IP fallback. */
export function getClientKey(userId: string | null, request: Request): string {
  if (userId) {
    return `user:${userId}`;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  if (ip) {
    return `ip:${ip}`;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }
  return "ip:unknown";
}
