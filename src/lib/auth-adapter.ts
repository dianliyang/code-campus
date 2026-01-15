import { Adapter, AdapterUser, AdapterSession } from "next-auth/adapters"
import { queryD1, runD1 } from "./d1"

interface DbUser {
  id: number;
  email: string;
  emailVerified?: string | null;
  name?: string | null;
  image?: string | null;
}

interface DbSession {
  sessionToken: string;
  userId: number;
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
    id: user.id.toString(),
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
    userId: session.userId.toString(),
    expires: new Date(session.expires)
  }
}

export function CodeCampusAdapter(): Adapter {
  return {
    async createUser(user) {
      const { email, emailVerified, name, image } = user;
      console.log(`[Adapter] Creating user: ${email}`);
      await runD1(
        "INSERT INTO users (email, emailVerified, name, image) VALUES (?, ?, ?, ?)",
        [email.toLowerCase(), emailVerified?.toISOString(), name, image]
      );
      const row = await queryD1<DbUser>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
      return mapUser(row[0])!;
    },
    async getUser(id) {
      const rows = await queryD1<DbUser>("SELECT * FROM users WHERE id = ? LIMIT 1", [parseInt(id)]);
      return mapUser(rows[0]);
    },
    async getUserByEmail(email) {
      const rows = await queryD1<DbUser>("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
      return mapUser(rows[0]);
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const rows = await queryD1<DbUser>(
        `SELECT u.* FROM users u JOIN accounts a ON u.id = a.userId WHERE a.provider = ? AND a.providerAccountId = ?`,
        [provider, providerAccountId]
      );
      return mapUser(rows[0]);
    },
    async updateUser(user) {
      const id = parseInt(user.id!);
      const email = user.email?.toLowerCase();
      await runD1(
        "UPDATE users SET email = ?, emailVerified = ?, name = ?, image = ? WHERE id = ?",
        [email, user.emailVerified?.toISOString(), user.name, user.image, id]
      );
      const row = await queryD1<DbUser>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      return mapUser(row[0])!;
    },
    async deleteUser(userId) {
      await runD1("DELETE FROM users WHERE id = ?", [parseInt(userId)]);
    },
    async linkAccount(account) {
      await runD1(
        `INSERT INTO accounts (userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parseInt(account.userId),
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
      await runD1(
        "INSERT INTO sessions (sessionToken, userId, expires) VALUES (?, ?, ?)",
        [session.sessionToken, parseInt(session.userId), session.expires.toISOString()]
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
      const row = await queryD1<DbSession>("SELECT * FROM sessions WHERE sessionToken = ? LIMIT 1", [session.sessionToken]);
      return mapSession(row[0])!;
    },
    async deleteSession(sessionToken) {
      await runD1("DELETE FROM sessions WHERE sessionToken = ?", [sessionToken]);
    },
    async createVerificationToken(verificationToken) {
      const { identifier, token, expires } = verificationToken;
      console.log(`[Adapter] Creating verification token for ${identifier}`);
      await runD1(
        "INSERT INTO verification_tokens (identifier, token, expires) VALUES (?, ?, ?)",
        [identifier.toLowerCase(), token, expires.toISOString()]
      );
      return verificationToken;
    },
    async useVerificationToken({ identifier, token }) {
      const id = identifier.toLowerCase();
      console.log(`[Adapter] useVerificationToken check for ${id}`);
      
      const rows = await queryD1<DbVerificationToken>(
        "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ? LIMIT 1",
        [id, token]
      );
      
      if (rows.length === 0) {
        console.warn(`[Adapter] No token found for ${id}`);
        // Diagnostic query: see if token exists for this identifier regardless of exact token match
        const countRows = await queryD1<{count: number}>("SELECT count(*) as count FROM verification_tokens WHERE identifier = ?", [id]);
        console.log(`[Adapter] Tokens currently in DB for this email: ${countRows[0]?.count || 0}`);
        return null;
      }
      
      console.log(`[Adapter] Token found, consuming...`);
      await runD1(
        "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?",
        [id, token]
      );
      
      const t = rows[0];
      return {
        identifier: t.identifier,
        token: t.token,
        expires: new Date(t.expires)
      };
    },
  }
}
