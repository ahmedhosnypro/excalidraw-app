import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getClientKey, rateLimit, rateLimited } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

// 5 signups per IP per 15 minutes — deters automated account creation.
const SIGNUP_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(request: Request) {
  const rlKey = `signup:${getClientKey(null, request)}`;
  const rl = rateLimit(rlKey, SIGNUP_LIMIT);
  if (!rl.ok) {
    return rateLimited(rl.resetAt);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({ email: normalizedEmail, passwordHash, name: name?.trim() || null })
    .returning({ id: users.id, email: users.email, name: users.name });

  if (!user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  return NextResponse.json(user, { status: 201 });
}
