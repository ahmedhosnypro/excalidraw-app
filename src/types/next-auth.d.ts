import type { DefaultSession } from "next-auth";

/**
 * Augment NextAuth types so the session user always carries its database `id`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
