import { Course } from "./scrapers/types";
import { up } from "@auth/d1-adapter";

const config = {
  isDev: process.env.NODE_ENV === "development",
  isRemote: process.env.REMOTE_DB === "true",
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  databaseId: process.env.CLOUDFLARE_DATABASE_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
};

let migrated = false;

async function ensureTables(binding: any) {
  if (migrated || !binding) return;
  try {
    // Auth.js D1Adapter expects 'up' to be run to initialize tables
    await up(binding);
    migrated = true;
    console.log("[D1] Migration successful");
  } catch (e: any) {
    console.warn("[D1] Migration skipped or failed:", e.message);
    migrated = true; // Don't retry every time if it fails (e.g. already exists)
  }
}

// Avoid "immutable" errors in Edge runtime by cloning results
const clone = <T>(obj: T): T => {
  try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
};

/**
 * Main query function handling Binding, Remote API, and Local Fallback
 */
export async function queryD1<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const binding = (process.env.DB || (globalThis as any).DB) as any;
  const isSelect = sql.trim().toLowerCase().startsWith("select");

  // 1. Cloudflare D1 Binding (Production/Edge)
  if (binding?.prepare) {
    await ensureTables(binding);
    const stmt = binding.prepare(sql).bind(...params);
    const res = isSelect ? await stmt.all() : await stmt.run();
    return clone(res.results || (isSelect ? [] : [res]));
  }

  // 2. Cloudflare API Fallback (Remote)
  if (config.isRemote && config.apiToken) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    });
    const json = await res.json();
    if (json.success) return clone(json.result[0].results);
  }

  // 3. Local SQLite Fallback (Development Node.js)
  if (config.isDev && process.env.NEXT_RUNTIME !== "edge") {
    try {
      const Database = require("better-sqlite3");
      const path = require("path");
      const fs = require("fs");
      const dir = path.join(process.cwd(), ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
      const file = fs.existsSync(dir) ? fs.readdirSync(dir).find((f: string) => f.endsWith(".sqlite")) : null;
      if (file) {
        const db = new Database(path.join(dir, file));
        const res = isSelect ? db.prepare(sql).all(...params) : db.prepare(sql).run(...params);
        return clone(isSelect ? res : [res]);
      }
    } catch (e) {}
  }

  // 4. Guest Mock
  if (config.isDev && sql.includes("users WHERE email = ?") && params[0] === "guest@codecampus.example.com") {
    return [clone({
      id: "guest",
      name: "Guest User",
      email: params[0],
      provider: "credentials",
      created_at: new Date().toISOString()
    })] as any;
  }

  return [];
}

export const runD1 = queryD1;

/**
 * Returns a D1-compatible interface for Auth.js
 */
export function getD1(): any {
  const binding = (process.env.DB || (globalThis as any).DB) as any;
  if (binding) ensureTables(binding);

  const wrap = (res: any) => ({ results: res, success: true, meta: { duration: 0, changes: res.length } });
  return {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        all: async () => wrap(await queryD1(sql, params)),
        run: async () => ({ success: true, meta: { duration: 0 } }),
        first: async (col?: string) => {
          const res = await queryD1(sql, params);
          return col ? (res[0] as any)?.[col] : res[0] || null;
        }
      })
    }),
    batch: (stmts: any[]) => Promise.all(stmts.map(s => s.all())),
    exec: (sql: string) => queryD1(sql).then(wrap)
  };
}

export function mapCourseFromRow(row: Record<string, unknown>): Course & { id: number; url: string } {
  const university = String(row.university || "").toLowerCase();
  const courseCode = String(row.course_code || "");
  const code = encodeURIComponent(courseCode);
  
  const fallbacks: Record<string, string> = {
    mit: `https://student.mit.edu/catalog/search.cgi?search=${code}`,
    stanford: `https://explorecourses.stanford.edu/search?q=${code}`,
    ucb: `https://classes.berkeley.edu/search/class/${code}`,
    cmu: "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search"
  };

  return {
    id: Number(row.id),
    university,
    courseCode,
    title: String(row.title || ""),
    units: String(row.units || ""),
    description: String(row.description || ""),
    url: (row.url as string) || fallbacks[university] || "#",
    department: String(row.department || ""),
    corequisites: String(row.corequisites || ""),
    level: String(row.level || ""),
    difficulty: Number(row.difficulty || 0),
    details: typeof row.details === "string" ? JSON.parse(row.details) : row.details || {},
    popularity: Number(row.popularity || 0),
    workload: String(row.workload || ""),
    isHidden: Boolean(row.is_hidden),
  };
}