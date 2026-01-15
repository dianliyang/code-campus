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
      from:
        process.env.EMAIL_FROM ||
        "CodeCampus <no-reply@codecampus.example.com>",
      maxAge: 24 * 60 * 60, // 24 hours
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`[Auth] 🪄 Magic Link for ${email}: ${url}`);

        if (
          process.env.AUTH_RESEND_KEY &&
          process.env.AUTH_RESEND_KEY !== "re_123456789"
        ) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "onboarding@resend.dev",
              to: email,
              subject: "🔒 Authenticate your CodeCampus Session",
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 48px 24px; }
                    .logo { color: #000000; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 40px; }
                    .dot { color: #3b82f6; }
                    .content { background-color: #fcfcfc; border: 1px solid #f0f0f0; padding: 48px; border-radius: 24px; }
                    h1 { font-size: 22px; font-weight: 900; color: #111827; margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.02em; }
                    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
                    .button { display: inline-block; background-color: #000000; color: #ffffff !important; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; padding: 20px 40px; border-radius: 12px; text-decoration: none; text-align: center; }
                    .divider { height: 1px; background-color: #eeeeee; margin: 40px 0; }
                    .footer { margin-top: 40px; text-align: center; }
                    .footer-text { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; }
                    .security { font-size: 12px; color: #9ca3af; line-height: 1.5; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="logo">CodeCampus<span class="dot">.</span></div>
                    <div class="content">
                      <h1>System Authentication</h1>
                      <p>A secure access request was initiated for your identity. Click the button below to authorize the session and enter the network.</p>
                      <a href="${url}" class="button">Authenticate Session</a>
                      <div class="divider"></div>
                      <div class="security">
                        <strong>Security Protocol:</strong> This link is valid for 24 hours and can only be used once. If you did not initiate this request, no action is required.
                      </div>
                    </div>
                    <div class="footer">
                      <p class="footer-text">© 2026 CodeCampus Global Network // 0xFC</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
              text: `Authenticate your CodeCampus Session: ${url}`,
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
      if (account?.provider === "resend" || account?.provider === "email")
        return true;
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
    },
  },
});
