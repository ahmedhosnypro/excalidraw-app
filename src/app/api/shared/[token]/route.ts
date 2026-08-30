import { NextResponse } from "next/server";

import { getSharedFile } from "@/lib/files";

/**
 * GET /api/shared/[token] — public, unauthenticated read-only access to a
 * shared drawing's name + scene content. Returns 404 if the token does not
 * match any drawing (or sharing was revoked).
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const shared = await getSharedFile(token);
  if (!shared) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(shared);
}
