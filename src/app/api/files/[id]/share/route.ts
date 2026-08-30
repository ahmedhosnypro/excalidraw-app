import { NextResponse } from "next/server";
import { z } from "zod";

import { enableShare, notFound, parseBody, revokeShare, withAuth } from "@/lib/files";

const shareSchema = z.object({
  /** Expiry in hours from now. Null/undefined = never expires. */
  expiresInHours: z.number().int().min(1).max(87600).nullable().optional(),
});

/** POST /api/files/[id]/share — enable (or rotate) public read-only sharing. */
export const POST = withAuth(async (ctx, request) => {
  const parsed = await parseBody(request, shareSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const hours = parsed.data.expiresInHours ?? null;
  const expiresAt = hours ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;
  const summary = await enableShare(ctx.userId, ctx.id, expiresAt);
  return summary ? NextResponse.json(summary) : notFound();
});

/** DELETE /api/files/[id]/share — revoke public sharing. */
export const DELETE = withAuth(async (ctx) => {
  const summary = await revokeShare(ctx.userId, ctx.id);
  return summary ? NextResponse.json(summary) : notFound();
});
