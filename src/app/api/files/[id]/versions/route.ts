import { NextResponse } from "next/server";

import { createVersionSnapshot, listVersions, notFound, withAuth } from "@/lib/files";

/** GET /api/files/[id]/versions — list all version snapshots (newest first). */
export const GET = withAuth(async (ctx) => {
  const versions = await listVersions(ctx.userId, ctx.id);
  return versions ? NextResponse.json(versions) : notFound();
});

/** POST /api/files/[id]/versions — manually create a snapshot of the current content. */
export const POST = withAuth(async (ctx) => {
  await createVersionSnapshot(ctx.userId, ctx.id);
  const versions = await listVersions(ctx.userId, ctx.id);
  return versions ? NextResponse.json(versions) : notFound();
});
