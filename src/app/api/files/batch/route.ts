import { NextResponse } from "next/server";
import { z } from "zod";

import {
  batchDeleteFiles,
  batchMoveFiles,
  batchStarFiles,
  isUserId,
  parseBody,
  requireUserId,
} from "@/lib/files";

const batchSchema = z.object({
  action: z.enum(["delete", "move", "star", "unstar"]),
  fileIds: z.array(z.string().min(1)).min(1).max(50),
  folderId: z.string().nullable().optional(),
});

/** POST /api/files/batch — apply a bulk action (delete/move/star/unstar) to many files. */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, batchSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const { action, fileIds, folderId } = parsed.data;

  let count = 0;
  if (action === "delete") {
    count = await batchDeleteFiles(auth, fileIds);
  } else if (action === "move") {
    count = await batchMoveFiles(auth, fileIds, folderId ?? null);
  } else {
    count = await batchStarFiles(auth, fileIds, action === "star");
  }
  return NextResponse.json({ ok: true, count });
}
