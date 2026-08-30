import { z } from "zod";

import { isUserId, parseBody, reorderFiles, requireUserId } from "@/lib/files";
import { NextResponse } from "next/server";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});

/** POST /api/files/reorder — persist a new drag-and-drop order for drawings. */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, reorderSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  await reorderFiles(auth, parsed.data.orderedIds);
  return NextResponse.json({ ok: true });
}
