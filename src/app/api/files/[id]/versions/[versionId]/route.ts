import { NextResponse } from "next/server";

import { getVersionContent, notFound, requireUserId, restoreVersion } from "@/lib/files";

/** GET /api/files/[id]/versions/[versionId] — load a version's scene content. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireUserId();
  if (typeof auth !== "string") {
    return auth;
  }
  const { id, versionId } = await context.params;
  const version = await getVersionContent(auth, id, versionId);
  return version ? NextResponse.json(version) : notFound();
}

/** POST /api/files/[id]/versions/[versionId] — restore the drawing to this version. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireUserId();
  if (typeof auth !== "string") {
    return auth;
  }
  const { id, versionId } = await context.params;
  const summary = await restoreVersion(auth, id, versionId);
  return summary ? NextResponse.json(summary) : notFound();
}
