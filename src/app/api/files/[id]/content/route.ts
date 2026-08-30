import { NextResponse } from "next/server";

import { loadContent, notFound, saveContent, withAuth } from "@/lib/files";

export const GET = withAuth(async (ctx) => {
  const result = await loadContent(ctx.userId, ctx.id);
  return result ? NextResponse.json(result) : notFound();
});

export const PUT = withAuth(async (ctx, request) => {
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "string") {
    return NextResponse.json({ error: "Expected a JSON string body" }, { status: 400 });
  }
  const saved = await saveContent(ctx.userId, ctx.id, body);
  return saved ? NextResponse.json({ ok: true }) : notFound();
});
