import { Course } from "./scrapers/types";

const REMOTE_DB = process.env.REMOTE_DB === "true";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// In-memory mock store for verification tokens during development
// Using globalThis to ensure persistence across hot reloads in next dev
const globalForMocks = globalThis as unknown as {
  mockVerificationTokens: Array<{
    identifier: string;
    token: string;
    expires: string;
  }>;
};

if (!globalForMocks.mockVerificationTokens) {
  globalForMocks.mockVerificationTokens = [];
}

const mockVerificationTokens = globalForMocks.mockVerificationTokens;

export async function queryD1<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  // console.log(`[D1 Query] SQL: ${sql.substring(0, 100)}... Params: ${JSON.stringify(params)}`);

  // 1. Try D1 Binding (Cloudflare Pages/Workers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindingDB = process.env.DB || (globalThis as any).DB;

  if (bindingDB && typeof bindingDB.prepare === "function") {
    try {
      // console.log("[D1 Binding] Executing query");
      const stmt = bindingDB.prepare(sql).bind(...params);
      if (sql.trim().toLowerCase().startsWith("select")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (stmt as any).all();
        return result.results || [];
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (stmt as any).run();
        return [result] as unknown as T[];
      }
    } catch (e) {
      console.error("[D1 Binding Error]", e);
      throw e;
    }
  }

  // 2. Remote HTTP API Fallback
  if (REMOTE_DB && ACCOUNT_ID && DATABASE_ID && API_TOKEN) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success) return json.result[0].results as T[];
            } else {
              const errText = await response.text();
              console.error(`[D1 Remote Error] status: ${response.status}. Database ID: ${DATABASE_ID}. Response: ${errText}`);
              if (response.status === 404) {
                console.error("CRITICAL: Your CLOUDFLARE_DATABASE_ID in .env does not match your wrangler.toml.");
                console.error(`EXPECTED (from wrangler.toml): 86b926a3-e461-4526-a1f8-2ba50a8070e2`);
                console.error(`ACTUAL (from .env): ${DATABASE_ID}`);
              }
            }
    } catch (err) {
      console.error("[D1 Remote Error]", err);
    }
  }

  // 3. Local Mode (better-sqlite3) - Enabled for local Node.js environment
  if (
    !REMOTE_DB &&
    !bindingDB &&
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME !== "edge"
  ) {
    try {
      const nodeProcess = process;
      const cwd = nodeProcess.cwd();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require("better-sqlite3");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");

      let dbPath = process.env.LOCAL_DB_PATH;

      if (!dbPath) {
        const wranglerDir = path.join(
          cwd,
          ".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
        );
        if (fs.existsSync(wranglerDir)) {
          const files = fs
            .readdirSync(wranglerDir)
            .filter((f: string) => f.endsWith(".sqlite"));
          if (files.length > 0) {
            const sortedFiles = files
              .map((f: string) => ({
                name: f,
                time: fs.statSync(path.join(wranglerDir, f)).mtime.getTime(),
              }))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => b.time - a.time);
            dbPath = path.join(wranglerDir, sortedFiles[0].name);
          }
        }
      }

      if (dbPath && fs.existsSync(dbPath)) {
        // console.log(`[D1 Local] Using SQLite: ${dbPath}`);
        const db = new Database(dbPath);
        if (sql.trim().toLowerCase().startsWith("select")) {
          return db.prepare(sql).all(...params) as T[];
        } else {
          const result = db.prepare(sql).run(...params);
          return [result] as unknown as T[];
        }
      }
    } catch (e) {
      console.warn("[D1 Local Fallback Error]", e);
    }
  }

  if (process.env.NODE_ENV === "development") {
    // console.warn(`[D1] No database binding or remote API found. Runtime: ${process.env.NEXT_RUNTIME}. Falling back to mocks.`);

    // Mock Verification Tokens (Magic Link Support in Dev)
    if (sql.includes("INSERT INTO verification_tokens")) {
      const [identifier, token, expires] = params as [string, string, string];
      mockVerificationTokens.push({ identifier, token, expires });
      console.log(
        `[D1 Mock] Token saved for ${identifier}, token: ${token.substring(
          0,
          8
        )}... Total: ${mockVerificationTokens.length}`
      );
      return [{ success: true }] as unknown as T[];
    }

    if (
      sql.includes(
        "SELECT * FROM verification_tokens WHERE identifier = ? AND token = ?"
      )
    ) {
      const [identifier, token] = params as [string, string];
      const found = mockVerificationTokens.find(
        (t) => t.identifier === identifier && t.token === token
      );
      console.log(
        `[D1 Mock] Token lookup for ${identifier}, token: ${token.substring(
          0,
          8
        )}... Result: ${found ? "Found" : "Not Found"}`
      );
      if (!found) {
        console.log(
          `[D1 Mock] Current tokens in store:`,
          mockVerificationTokens
            .map((t) => `${t.identifier}:${t.token.substring(0, 8)}...`)
            .join(", ")
        );
      }
      return (found ? [found] : []) as unknown as T[];
    }

    if (
      sql.includes(
        "DELETE FROM verification_tokens WHERE identifier = ? AND token = ?"
      )
    ) {
      const [identifier, token] = params as [string, string];
      const idx = mockVerificationTokens.findIndex(
        (t) => t.identifier === identifier && t.token === token
      );
      if (idx !== -1) mockVerificationTokens.splice(idx, 1);
      console.log(
        `[D1 Mock] Token deleted for ${identifier}, token: ${token.substring(
          0,
          8
        )}... Remaining: ${mockVerificationTokens.length}`
      );
      return [{ success: true }] as unknown as T[];
    }

    // Mock Guest User Fetch
    if (
      sql.includes("SELECT * FROM users WHERE email = ?") &&
      params[0] === "guest@codecampus.example.com"
    ) {
      return [
        {
          id: "guest-user-id",
          name: "Guest User",
          email: "guest@codecampus.example.com",
          image: null,
          provider: "credentials",
          created_at: new Date().toISOString(),
        },
      ] as unknown as T[];
    }

    // Mock User Courses (Empty but valid)
    if (sql.includes("FROM user_courses")) {
      return [] as T[];
    }
  }

  return [];
}

export async function runD1(
  sql: string,
  params: unknown[] = []
): Promise<unknown> {
  return queryD1(sql, params);
}

export function mapCourseFromRow(
  row: Record<string, unknown>
): Course & { id: number; url: string } {
  const university = ((row.university as string) || "").toLowerCase();
  const courseCode = (row.course_code as string) || "";
  const dbUrl = row.url as string;
  let fallbackUrl = "#";
  const code = encodeURIComponent(courseCode);
  switch (university) {
    case "mit":
      fallbackUrl = `https://student.mit.edu/catalog/search.cgi?search=${code}`;
      break;
    case "stanford":
      fallbackUrl = `https://explorecourses.stanford.edu/search?q=${code}`;
      break;
    case "ucb":
      fallbackUrl = `https://classes.berkeley.edu/search/class/${code}`;
      break;
    case "cmu":
      fallbackUrl = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
      break;
  }
  return {
    id: row.id as number,
    university: university,
    courseCode: courseCode,
    title: (row.title as string) || "",
    units: (row.units as string) || "",
    description: (row.description as string) || "",
    url: dbUrl || fallbackUrl,
    department: (row.department as string) || "",
    corequisites: (row.corequisites as string) || "",
    level: (row.level as string) || "",
    difficulty: (row.difficulty as number) || 0,
    details:
      typeof row.details === "string"
        ? JSON.parse(row.details)
        : row.details || {},
    popularity: (row.popularity as number) || 0,
    workload: (row.workload as string) || "",
    isHidden: Boolean(row.is_hidden),
  };
}
