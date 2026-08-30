import { NextResponse } from "next/server";
import { z } from "zod";

import { createFile, isUserId, listFiles, requireUserId } from "@/lib/files";

export async function GET() {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const result = await listFiles(auth);
  return NextResponse.json(result);
}

const createSchema = z.object({
  name: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const body: unknown = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const file = await createFile(auth, parsed.data.name);
  return NextResponse.json(file, { status: 201 });
}
