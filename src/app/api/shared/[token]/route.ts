import { NextResponse } from "next/server";

import { getSharedFile } from "@/lib/files";
import { getClientKey, rateLimit, rateLimited } from "@/lib/rate-limit";

// 60 reads per IP per minute — generous for normal viewing, deters token
// enumeration (UUIDs are 122 bits of entropy, so brute-force is infeasible,
// but rate limiting adds defense-in-depth + protects server load).
const SHARED_LIMIT = { limit: 60, windowMs: 60 * 1000 };

/**
 * GET /api/shared/[token] — public, unauthenticated read-only access to a
 * shared drawing's name + scene content. Returns 404 if the token does not
 * match any drawing (or sharing was revoked).
 */
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const rlKey = `shared:${getClientKey(null, request)}`;
  const rl = rateLimit(rlKey, SHARED_LIMIT);
  if (!rl.ok) {
    return rateLimited(rl.resetAt);
  }

  const { token } = await context.params;
  const shared = await getSharedFile(token);
  if (!shared) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(shared);
}
