import { compare, hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { users } from "@/db/schema";

/** Update the user's display name. Returns the updated name or null on failure. */
export async function updateUserName(userId: string, name: string): Promise<string | null> {
  const trimmed = name.trim() || "Untitled";
  const [row] = await db
    .update(users)
    .set({ name: trimmed })
    .where(eq(users.id, userId))
    .returning({ name: users.name });
  return row?.name ?? null;
}

/** Change the user's password after verifying the current one. Returns true on success. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) {
    return false;
  }
  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) {
    return false;
  }
  const newHash = await hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(and(eq(users.id, userId)));
  return true;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const updateNameSchema = z.object({
  name: z.string().min(1).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
