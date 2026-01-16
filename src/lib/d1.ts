import { Course } from "./scrapers/types";

const REMOTE_DB = process.env.REMOTE_DB === "true";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export async function queryD1<T = unknown>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
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
      }
    } catch (err) {
      console.error("[D1 Remote Error]", err);
    }
  }

  // 3. Local Mode (better-sqlite3) - REMOVED for Edge Compatibility
  // The previous implementation used Node.js APIs (fs, path, better-sqlite3) and process.versions
  // which caused build errors in the Edge Runtime.
  // For local development, rely on 'wrangler dev' or Remote D1 fallback.
  
  if (process.env.NODE_ENV === "development") {
    console.warn("[D1] No database binding found and remote fallback inactive. Query returning empty.");
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
