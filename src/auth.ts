import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { queryD1, runD1 } from "@/lib/d1";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    /*
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    */
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const users = await queryD1<{ id: number, email: string, name: string, password?: string }>(
            "SELECT * FROM users WHERE email = ? LIMIT 1", 
            [email]
          );

          if (users.length > 0) {
            const u = users[0];
            if (u.password) {
              const isValid = await bcrypt.compare(password, u.password);
              if (!isValid) return null;
            } else {
              return null;
            }
            return {
              id: u.id.toString(),
              email: u.email,
              name: u.name,
            };
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          await runD1(
            "INSERT INTO users (email, password, provider, provider_id, name) VALUES (?, ?, 'credentials', ?, ?)",
            [email, hashedPassword, email, email.split('@')[0]]
          );
          
          const newUsers = await queryD1<{ id: number, email: string, name: string }>(
             "SELECT * FROM users WHERE email = ? LIMIT 1", 
             [email]
          );
          
          if (newUsers.length > 0) {
            const u = newUsers[0];
             return {
              id: u.id.toString(),
              email: u.email,
              name: u.name,
            };
          }
          return null;
        } catch (e) {
          console.error("Auth error:", e);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const email = user.email;
          if (!email) return false;

          const existingUser = await queryD1<{ id: number }>(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [email]
          );

          if (existingUser.length === 0) {
            await runD1(
              "INSERT INTO users (email, name, image, provider, provider_id) VALUES (?, ?, ?, ?, ?)",
              [email, user.name || email.split('@')[0], user.image, account.provider, account.providerAccountId]
            );
          }
          return true;
        } catch (e) {
          console.error("OAuth signin error:", e);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      console.log("[Auth] Session Callback - Token Sub:", token?.sub);
      if (session.user && session.user.email) {
        try {
           const dbUser = await queryD1<{ id: number }>(
             "SELECT id FROM users WHERE email = ? LIMIT 1",
             [session.user.email]
           );
           if (dbUser.length > 0) {
             session.user.id = dbUser[0].id.toString();
           }
        } catch (e) {
          console.error("Session lookup error:", e);
        }
      }
      return session;
    }
  }
});
