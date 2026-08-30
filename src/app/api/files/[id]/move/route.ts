import { z } from "zod";

import { moveFile, notFound, parseBody, withAuth } from "@/lib/files";
import { NextResponse } from "next/server";

const moveSchema = z.object({ folderId: z.string().nullable() });

/** POST /api/files/[id]/move — move a drawing to a folder (or root when folderId is null). */
export const POST = withAuth(async (ctx, request) => {
  const parsed = await parseBody(request, moveSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const summary = await moveFile(ctx.userId, ctx.id, parsed.data.folderId);
  return summary ? NextResponse.json(summary) : notFound();
});
