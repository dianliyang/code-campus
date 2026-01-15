import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { queryD1 } from "@/lib/d1";
import { CodeCampusAdapter } from "@/lib/auth-adapter";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: CodeCampusAdapter(),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || "re_123456789",
      from: process.env.EMAIL_FROM || "CodeCampus <no-reply@codecampus.example.com>",
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`

[Auth] 🪄 Magic Link for ${email}: ${url}

`);
        
        if (process.env.AUTH_RESEND_KEY && process.env.AUTH_RESEND_KEY !== "re_123456789") {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "onboarding@resend.dev",
              to: email,
              subject: "Sign in to CodeCampus",
              html: `<p>Click the link below to sign in to your account:</p><p><a href="${url}">Sign in to CodeCampus</a></p>`,
              text: `Sign in to CodeCampus: ${url}`,
            }),
          });

          if (!res.ok) {
            const error = await res.json();
            console.error("[Resend Error]", error);
          }
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "resend" || account?.provider === "email") return true;
      return true;
    },
    async session({ session }) {
      if (session.user && session.user.email) {
         try {
           const dbUser = await queryD1<{ id: number }>(
             "SELECT id FROM users WHERE email = ? LIMIT 1",
             [session.user.email]
           );
           if (dbUser.length > 0) {
             (session.user as { id: string }).id = dbUser[0].id.toString();
           }
        } catch (e) {
          console.error("Session lookup error:", e);
        }
      }
      return session;
    },
    async authorized({ auth }) {
      return !!auth;
    }
  }
});
