import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
  },
  trustHost: true,
  providers: [], // Providers are added in auth.ts to avoid MissingAdapter error in middleware
} satisfies NextAuthConfig;
