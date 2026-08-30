import { NextResponse } from "next/server";

import { isUserId, listRecentFiles, requireUserId } from "@/lib/files";

/** GET /api/files/recent — the 5 most recently opened drawings. */
export async function GET() {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const recent = await listRecentFiles(auth);
  return NextResponse.json(recent);
}
