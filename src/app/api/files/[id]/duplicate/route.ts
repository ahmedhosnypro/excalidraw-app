import { NextResponse } from "next/server";

import { duplicateFile, notFound, withAuth } from "@/lib/files";

/** POST /api/files/[id]/duplicate — clone a drawing's metadata + content. */
export const POST = withAuth(async (ctx) => {
  const copy = await duplicateFile(ctx.userId, ctx.id);
  return copy ? NextResponse.json(copy, { status: 201 }) : notFound();
});
