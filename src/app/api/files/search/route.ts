import { NextResponse } from "next/server";
import { z } from "zod";

import { isUserId, parseBody, requireUserId, searchFileContents } from "@/lib/files";

const searchSchema = z.object({ query: z.string().min(1).max(200) });

/** POST /api/files/search — full-text search across drawing content (text elements). */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, searchSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const results = await searchFileContents(auth, parsed.data.query);
  return NextResponse.json(results);
}
