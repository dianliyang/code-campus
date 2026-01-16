import { Adapter, AdapterUser, AdapterSession } from "next-auth/adapters";
import { queryD1, runD1 } from "@/lib/d1";

interface DbUser {
  id: string;
  email: string;
  emailVerified?: string | null;
  name?: string | null;
  image?: string | null;
}

interface DbSession {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
}

interface DbVerificationToken {
  identifier: string;
  token: string;
  expires: string;
}

function mapUser(user: DbUser): AdapterUser | null {
  if (!user) return null;
  // Extract values from potentially frozen D1 objects to avoid "immutable" errors
  return {
    id: String(user.id || ""),
    email: String(user.email || ""),
    emailVerified: user.emailVerified
      ? new Date(String(user.emailVerified))
      : null,
    name: user.name ? String(user.name) : null,
    image: user.image ? String(user.image) : null,
  };
}

function mapSession(session: DbSession): AdapterSession | null {
  if (!session) return null;
  // Extract values from potentially frozen D1 objects to avoid "immutable" errors
  return {
    sessionToken: String(session.sessionToken || ""),
    userId: String(session.userId || ""),
    expires: new Date(String(session.expires || "")),
  };
}

// Helper function to safely extract values from potentially frozen D1 objects
function safeGetValue(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: string = ""
): string {
  try {
    // Try bracket notation first (works with frozen objects)
    const value = obj[key];
    return value != null ? String(value) : defaultValue;
  } catch {
    // Fallback if property access fails
    try {
      const value = obj[String(key)];
      return value != null ? String(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

export function CodeCampusAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = crypto.randomUUID();
      const { email, emailVerified, name, image } = user;
      console.log(`[Adapter] createUser: ${email}`);
      try {
        await runD1(
          "INSERT INTO users (id, email, emailVerified, name, image) VALUES (?, ?, ?, ?, ?)",
          [
            id,
            email.toLowerCase(),
            emailVerified?.toISOString() ?? null,
            name,
            image,
          ]
        );
        return { ...user, id };
      } catch (err) {
        console.error("[Adapter] createUser Error:", err);
        throw err;
      }
    },
    async getUser(id) {
      const rows = await queryD1<DbUser>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return mapUser(rows[0]);
    },
    async getUserByEmail(email) {
      const rows = await queryD1<DbUser>(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email.toLowerCase()]
      );
      return mapUser(rows[0]);
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await queryD1<DbUser>(
        `SELECT u.* FROM users u JOIN accounts a ON u.id = a.userId WHERE a.provider = ? AND a.providerAccountId = ? LIMIT 1`,
        [provider, providerAccountId]
      );
      return mapUser(rows[0]);
    },
    async updateUser(user) {
      const { email, emailVerified, name, image, id } = user;
      await runD1(
        "UPDATE users SET email = ?, emailVerified = ?, name = ?, image = ? WHERE id = ?",
        [
          email ? email.toLowerCase() : null,
          emailVerified?.toISOString() ?? null,
          name,
          image,
          id,
        ]
      );
      const rows = await queryD1<DbUser>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      const updatedUser = mapUser(rows[0]);
      if (!updatedUser) {
        throw new Error(`Failed to retrieve updated user with id: ${id}`);
      }
      return updatedUser;
    },
    async deleteUser(userId) {
      await runD1("DELETE FROM users WHERE id = ?", [userId]);
    },
    async linkAccount(account) {
      const id = crypto.randomUUID();
      await runD1(
        `INSERT INTO accounts (id, userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token,
          account.access_token,
          account.expires_at,
          account.token_type,
          account.scope,
          account.id_token,
          account.session_state,
        ]
      );
      return account;
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await runD1(
        "DELETE FROM accounts WHERE provider = ? AND providerAccountId = ?",
        [provider, providerAccountId]
      );
    },
    async createSession(session) {
      const id = crypto.randomUUID();
      await runD1(
        "INSERT INTO sessions (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)",
        [
          id,
          session.sessionToken,
          session.userId,
          session.expires.toISOString(),
        ]
      );
      return session;
    },
    async getSessionAndUser(sessionToken) {
      const sessionRows = await queryD1<DbSession>(
        "SELECT * FROM sessions WHERE sessionToken = ? LIMIT 1",
        [sessionToken]
      );
      if (!sessionRows.length) return null;

      // Extract userId from potentially frozen D1 object
      const session = sessionRows[0];
      const userId = String(session.userId || "");
      const userRows = await queryD1<DbUser>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      if (!userRows.length) return null;

      const mappedSession = mapSession(session);
      const mappedUser = mapUser(userRows[0]);

      if (!mappedSession || !mappedUser) return null;

      return {
        session: mappedSession,
        user: mappedUser,
      };
    },
    async updateSession(session) {
      await runD1("UPDATE sessions SET expires = ? WHERE sessionToken = ?", [
        session.expires?.toISOString(),
        session.sessionToken,
      ]);
      const rows = await queryD1<DbSession>(
        "SELECT * FROM sessions WHERE sessionToken = ? LIMIT 1",
        [session.sessionToken]
      );
      const updatedSession = mapSession(rows[0]);
      if (!updatedSession) {
        throw new Error(
          `Failed to retrieve updated session: ${session.sessionToken}`
        );
      }
      return updatedSession;
    },
    async deleteSession(sessionToken) {
      await runD1("DELETE FROM sessions WHERE sessionToken = ?", [
        sessionToken,
      ]);
    },
    async createVerificationToken(verificationToken) {
      const { identifier, token, expires } = verificationToken;
      const id = identifier.toLowerCase();
      console.log(`[Adapter] createVerificationToken for ${id}`);
      try {
        const result = await runD1(
          "INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)",
          [id, token, expires.toISOString()]
        );
        console.log(`[Adapter] createVerificationToken success:`, result);
        return verificationToken;
      } catch (err) {
        console.error("[Adapter] createVerificationToken Error:", err);
        throw err;
      }
    },
    async useVerificationToken({ identifier, token }) {
      const id = identifier.toLowerCase();
      const tokenPreview =
        token && typeof token === "string" ? token.substring(0, 8) : "unknown";
      console.log(
        `[Adapter] useVerificationToken check: ${id}, token: ${tokenPreview}...`
      );
      try {
        const rows = await queryD1<DbVerificationToken>(
          "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ? LIMIT 1",
          [id, token]
        );

        if (rows.length === 0) {
          console.warn("[Adapter] No token found in DB.");
          return null;
        }

        // Extract values from frozen D1 object using safe property access
        const row = rows[0] as unknown as Record<string, unknown>;
        const identifierValue = safeGetValue(row, "identifier", id);
        const tokenValue = safeGetValue(row, "token", token);
        const expiresValue = safeGetValue(row, "expires", "");

        const expiresDate = new Date(expiresValue);
        if (isNaN(expiresDate.getTime())) {
          console.error("[Adapter] Invalid expires date:", expiresValue);
          return null;
        }

        // Check if token has expired
        const now = new Date();
        if (expiresDate < now) {
          console.warn(
            "[Adapter] Token expired. Expires:",
            expiresDate,
            "Now:",
            now
          );
          // Still delete the expired token
          await runD1(
            "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?",
            [id, token]
          );
          return null;
        }

        console.log("[Adapter] Token found and valid, consuming...");

        await runD1(
          "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?",
          [id, token]
        );

        // Return plain object with fresh values
        return {
          identifier: identifierValue,
          token: tokenValue,
          expires: expiresDate,
        };
      } catch (err) {
        console.error("[Adapter] useVerificationToken Error:", err);
        return null;
      }
    },
  };
}
