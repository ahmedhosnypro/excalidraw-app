import { NextResponse } from "next/server";

import { isUserId, parseBody, requireUserId } from "@/lib/files";
import { changePassword, changePasswordSchema } from "@/lib/account";

/** POST /api/account/password — change the user's password (requires current). */
export async function POST(request: Request) {
  const auth = await requireUserId();
  if (!isUserId(auth)) {
    return auth;
  }
  const parsed = await parseBody(request, changePasswordSchema);
  if (parsed instanceof NextResponse) {
    return parsed;
  }
  const ok = await changePassword(auth, parsed.data.currentPassword, parsed.data.newPassword);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
