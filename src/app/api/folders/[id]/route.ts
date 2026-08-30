import { z } from "zod";

import {
  deleteFolder,
  isAuthIdParam,
  notFound,
  parseBody,
  renameFolder,
  resolveAuthIdParam,
} from "@/lib/files";
import { NextResponse } from "next/server";

const patchSchema = z.object({ name: z.string().min(1).max(100) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const ctx = await resolveAuthIdParam(context);
  if (!isAuthIdParam(ctx)) {
    return ctx;
  }
  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const folder = await renameFolder(ctx.userId, ctx.id, parsed.data.name);
  return folder ? NextResponse.json(folder) : notFound();
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const ctx = await resolveAuthIdParam(context);
  if (!isAuthIdParam(ctx)) {
    return ctx;
  }
  const deleted = await deleteFolder(ctx.userId, ctx.id);
  return deleted ? NextResponse.json({ ok: true }) : notFound();
}
