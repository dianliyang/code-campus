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
      throw new Error("Missing Cloudflare credentials for remote D1 access");
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
    const db = new Database(dbPath, { readonly: true });
    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T[];
    } finally {
      db.close();
    }
  }
}

// Helper to parse the JSON 'details' column and map other fields
export function mapCourseFromRow(row: Record<string, unknown>): Course & { id: number; url: string } {
  const university = (row.university as string || "").toLowerCase();
  const courseCode = row.course_code as string || "";
  
  // URL generation
  let url = "#";
  const code = encodeURIComponent(courseCode);
  switch (university) {
    case 'mit':
      url = `https://student.mit.edu/catalog/search.cgi?search=${code}`;
      break;
    case 'stanford':
      url = `https://explorecourses.stanford.edu/search?q=${code}`;
      break;
    case 'ucb':
      url = `https://classes.berkeley.edu/search/class/${code}`;
      break;
    case 'cmu':
      url = "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search";
      break;
  }

  return {
    id: row.id as number,
    university: university,
    courseCode: courseCode,
    title: row.title as string || "",
    units: row.units as string || "",
    description: row.description as string || "",
    department: row.department as string || "",
    details: typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {}),
    popularity: (row.popularity as number) || 0,
    field: (row.field as string) || "",
    timeCommitment: (row.time_commitment as string) || "",
    isHidden: Boolean(row.is_hidden),
    url
  };
}
