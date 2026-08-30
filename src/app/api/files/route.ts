import { NextResponse } from "next/server";
import { z } from "zod";

import {
  countFiles,
  createFile,
  FILE_LIMIT,
  isUserId,
  listFiles,
  parseBody,
  requireUserId,
} from "@/lib/files";

export async function GET() {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  return NextResponse.json(await listFiles(auth));
}

const createSchema = z.object({ name: z.string().max(255).optional() });

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const count = await countFiles(auth);
  if (count >= FILE_LIMIT) {
    return NextResponse.json(
      { error: `Drawing limit reached (${FILE_LIMIT}). Delete some drawings to create more.` },
      { status: 409 }
    );
  }
  const parsed = await parseBody(request, createSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const file = await createFile(auth, parsed.data.name);
  return NextResponse.json(file, { status: 201 });
}
