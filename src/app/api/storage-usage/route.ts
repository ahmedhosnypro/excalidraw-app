import { NextResponse } from "next/server";

import { getStorageUsage, isUserId, requireUserId } from "@/lib/files";

/** GET /api/storage-usage — total bytes + file count for the authenticated user. */
export async function GET() {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const usage = await getStorageUsage(auth);
  return NextResponse.json(usage);
}
