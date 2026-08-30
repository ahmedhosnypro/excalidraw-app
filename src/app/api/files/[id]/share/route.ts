import { NextResponse } from "next/server";

import { enableShare, notFound, revokeShare, withAuth } from "@/lib/files";

/** POST /api/files/[id]/share — enable (or rotate) public read-only sharing. */
export const POST = withAuth(async (ctx) => {
  const summary = await enableShare(ctx.userId, ctx.id);
  return summary ? NextResponse.json(summary) : notFound();
});

/** DELETE /api/files/[id]/share — revoke public sharing. */
export const DELETE = withAuth(async (ctx) => {
  const summary = await revokeShare(ctx.userId, ctx.id);
  return summary ? NextResponse.json(summary) : notFound();
});
