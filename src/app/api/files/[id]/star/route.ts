import { NextResponse } from "next/server";

import { notFound, toggleStar, withAuth } from "@/lib/files";

/** POST /api/files/[id]/star — toggle the starred (pinned) flag on a drawing. */
export const POST = withAuth(async (ctx) => {
  const summary = await toggleStar(ctx.userId, ctx.id);
  return summary ? NextResponse.json(summary) : notFound();
});
