import { Course } from './scrapers/types';
import fs from 'fs';
import path from 'path';

const REMOTE_DB = process.env.REMOTE_DB === 'true';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Local DB path finding
function getLocalDbPath(): string | null {
  const baseDir = path.join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!fs.existsSync(baseDir)) return null;
  
  const files = fs.readdirSync(baseDir);
  const sqliteFile = files.find(f => f.endsWith('.sqlite'));
  return sqliteFile ? path.join(baseDir, sqliteFile) : null;
}

export interface D1Result<T = unknown> {
  success: boolean;
  meta: unknown;
  results: T[];
}

export async function queryD1<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (REMOTE_DB) {
    if (!ACCOUNT_ID || !DATABASE_ID || !API_TOKEN) {
      // Fallback to wrangler CLI if credentials aren't in env
      // This is slower but works in this environment
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { exec } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const tmpFileName = path.join(process.cwd(), `.tmp_query_${Date.now()}.sql`);
      try {
        // Simple parameter replacement for CLI
        let processedSql = sql;
        params.forEach(param => {
          const escaped = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : (param ?? 'NULL');
          processedSql = processedSql.replace('?', String(escaped));
        });

        console.log(`[D1 Remote] Executing: ${processedSql.substring(0, 100)}...`);
        const { stdout } = await execAsync(`npx wrangler d1 execute code-campus-db --remote --command="${processedSql.replace(/"/g, '\\"')}" --json`);
        
        if (processedSql.trim().toLowerCase().startsWith('select')) {
          // Extract only the JSON part from wrangler output
                    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
                              if (!jsonMatch) {
                                console.error("Full Wrangler STDOUT:", stdout);
                                throw new Error("No JSON array found in wrangler output");
                              }
                              
                              // console.log("[D1 Debug] Raw JSON:", jsonMatch[0]);
                                        const result = JSON.parse(jsonMatch[0]);
                                        console.log("[D1 Debug] Full result:", JSON.stringify(result, null, 2));
                                        // Find the result that has results property (wrangler returns multiple objects for setup + execution)          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dataResult = result.find((r: any) => r.results && Array.isArray(r.results) && r.results.length > 0);
          // If we found a result with data, return it. If not but the array has items, it might be the last one.
          const finalResults = (dataResult?.results || result[result.length - 1]?.results || []) as T[];
          console.log(`[D1 Debug] Found ${finalResults.length} rows.`);
          return finalResults;
        }
        return [] as T[];
      } catch (e) {
        console.error("Wrangler fallback failed:", e);
        throw new Error("Missing Cloudflare credentials and wrangler fallback failed");
      } finally {
        if (fs.existsSync(tmpFileName)) fs.unlinkSync(tmpFileName);
      }
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql,
        params
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`D1 API Error: ${response.status} ${text}`);
    }

    const json = await response.json();
    if (!json.success) {
       throw new Error(`D1 Query Failed: ${JSON.stringify(json.errors)}`);
    }

    // Cloudflare API returns result in the first element of 'result' array for single query
    return json.result[0].results as T[];

  } else {
    // Local Mode
    const dbPath = getLocalDbPath();
    if (!dbPath) {
      console.warn("Local D1 database file not found. Returning empty results.");
      return [];
    }

    // Dynamically require better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: false }); // Changed to false to allow writes
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toLowerCase().startsWith('select')) {
        return stmt.all(...params) as T[];
      } else {
        const info = stmt.run(...params);
        return [info] as unknown as T[];
      }
    } finally {
      db.close();
    }
  }
}

/**
 * Specifically for non-returning statements (INSERT, UPDATE, DELETE)
 */
export async function runD1(sql: string, params: unknown[] = []): Promise<unknown> {
  return queryD1(sql, params);
}

// Helper to parse the JSON 'details' column and map other fields
export function mapCourseFromRow(row: Record<string, unknown>): Course & { id: number; url: string } {
  const university = (row.university as string || "").toLowerCase();
  const courseCode = row.course_code as string || "";
  const dbUrl = row.url as string;
  
  // URL generation fallback
  let fallbackUrl = "#";
  const code = encodeURIComponent(courseCode);
  switch (university) {
    case 'mit':
      fallbackUrl = `https://student.mit.edu/catalog/search.cgi?search=${code}`;
      break;
    case 'stanford':
      fallbackUrl = `https://explorecourses.stanford.edu/search?q=${code}`;
      break;
    case 'ucb':
      fallbackUrl = `https://classes.berkeley.edu/search/class/${code}`;
      break;
    case 'cmu':
      fallbackUrl = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
      break;
  }

  return {
    id: row.id as number,
    university: university,
    courseCode: courseCode,
    title: row.title as string || "",
    units: row.units as string || "",
    description: row.description as string || "",
    url: dbUrl || fallbackUrl,
    department: row.department as string || "",
    corequisites: row.corequisites as string || "",
    level: row.level as string || "",
    difficulty: (row.difficulty as number) || 0,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
    popularity: (row.popularity as number) || 0,
    workload: (row.workload as string) || "",
    isHidden: Boolean(row.is_hidden)
  };
}