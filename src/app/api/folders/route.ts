import { NextResponse } from "next/server";
import { z } from "zod";

import { createFolder, isUserId, listFolders, parseBody, requireUserId } from "@/lib/files";

export async function GET() {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  return NextResponse.json(await listFolders(auth));
}

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const folder = await createFolder(auth, parsed.data.name);
  return NextResponse.json(folder, { status: 201 });
}
