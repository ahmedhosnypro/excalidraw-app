import { NextResponse } from "next/server";

import { isUserId, parseBody, requireUserId } from "@/lib/files";
import { updateNameSchema, updateUserName } from "@/lib/account";

/** PATCH /api/account/name — update the user's display name. */
export async function PATCH(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, updateNameSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const name = await updateUserName(auth, parsed.data.name);
  if (name === null) {
    return NextResponse.json({ error: "Failed to update name" }, { status: 500 });
  }
  return NextResponse.json({ name });
}
