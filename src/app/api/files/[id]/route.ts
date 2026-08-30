import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteFile, getFile, notFound, renameFile, touchFile, withAuth } from "@/lib/files";

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  touch: z.boolean().optional(),
});

export const GET = withAuth(async (ctx) => {
  const file = await getFile(ctx.userId, ctx.id);
  return file ? NextResponse.json(file) : notFound();
});

export const PATCH = withAuth(async (ctx, request) => {
  const body: unknown = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.name !== undefined) {
    const renamed = await renameFile(ctx.userId, ctx.id, parsed.data.name);
    return renamed ? NextResponse.json(renamed) : notFound();
  }

  if (parsed.data.touch) {
    await touchFile(ctx.userId, ctx.id);
    const file = await getFile(ctx.userId, ctx.id);
    return file ? NextResponse.json(file) : notFound();
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
});

export const DELETE = withAuth(async (ctx) => {
  const deleted = await deleteFile(ctx.userId, ctx.id);
  return deleted ? NextResponse.json({ ok: true }) : notFound();
});
