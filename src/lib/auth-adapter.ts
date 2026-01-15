import { Adapter, AdapterUser, AdapterSession } from "next-auth/adapters"
import { queryD1, runD1 } from "./d1"

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
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    name: user.name ?? null,
    image: user.image ?? null
  }
}

function mapSession(session: DbSession): AdapterSession | null {
  if (!session) return null;
  return {
    sessionToken: session.sessionToken,
    userId: session.userId,
    expires: new Date(session.expires)
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
          [id, email.toLowerCase(), emailVerified?.toISOString() ?? null, name, image]
        );
        return { ...user, id };
      } catch (err) {
        console.error("[Adapter] createUser Error:", err);
        throw err;
      }
    },
    async getUser(id) {
      const rows = await queryD1<DbUser>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return mapUser(rows[0]);
    },
    async getUserByEmail(email) {
      const rows = await queryD1<DbUser>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
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
        [email?.toLowerCase(), emailVerified?.toISOString() ?? null, name, image, id]
      );
      const rows = await queryD1<DbUser>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return mapUser(rows[0])!;
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
          account.session_state
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
        [id, session.sessionToken, session.userId, session.expires.toISOString()]
      );
      return session;
    },
    async getSessionAndUser(sessionToken) {
      const sessionRows = await queryD1<DbSession>(
        "SELECT * FROM sessions WHERE sessionToken = ? LIMIT 1",
        [sessionToken]
      );
      if (!sessionRows.length) return null;
      
      const session = sessionRows[0];
      const userRows = await queryD1<DbUser>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [session.userId]
      );
      if (!userRows.length) return null;

      return {
        session: mapSession(session)!,
        user: mapUser(userRows[0])!
      }
    },
    async updateSession(session) {
      await runD1(
        "UPDATE sessions SET expires = ? WHERE sessionToken = ?",
        [session.expires?.toISOString(), session.sessionToken]
      );
      const rows = await queryD1<DbSession>("SELECT * FROM sessions WHERE sessionToken = ? LIMIT 1", [session.sessionToken]);
      return mapSession(rows[0])!;
    },
    async deleteSession(sessionToken) {
      await runD1("DELETE FROM sessions WHERE sessionToken = ?", [sessionToken]);
    },
    async createVerificationToken(verificationToken) {
      const { identifier, token, expires } = verificationToken;
      const id = identifier.toLowerCase();
      console.log(`[Adapter] createVerificationToken: ${id}`);
      try {
        await runD1(
          "INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)",
          [id, token, expires.toISOString()]
        );
        return verificationToken;
      } catch (err) {
        console.error("[Adapter] createVerificationToken Error:", err);
        throw err;
      }
    },
    async useVerificationToken({ identifier, token }) {
      const id = identifier.toLowerCase();
      console.log(`[Adapter] useVerificationToken check: ${id}`);
      try {
        const rows = await queryD1<DbVerificationToken>(
          "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ? LIMIT 1",
          [id, token]
        );
        
        if (rows.length === 0) {
          console.warn("[Adapter] No token found in DB.");
          return null;
        }
        
        const t = rows[0];
        console.log("[Adapter] Token found, consuming...");
        
        await runD1(
          "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?",
          [id, token]
        );
        
        return {
          identifier: t.identifier,
          token: t.token,
          expires: new Date(t.expires)
        };
      } catch (err) {
        console.error("[Adapter] useVerificationToken Error:", err);
        return null;
      }
    },
  }
}