import { Course } from './scrapers/types';

const REMOTE_DB = process.env.REMOTE_DB === 'true';
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Interface for the D1 Binding (Cloudflare Workers type)
interface D1DatabaseBinding {
  prepare: (query: string) => D1PreparedStatement;
  dump: () => Promise<ArrayBuffer>;
  batch: (statements: D1PreparedStatement[]) => Promise<D1Result[]>;
  exec: (query: string) => Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>(colName?: string) => Promise<T | null>;
  run: <T = unknown>() => Promise<D1Result<T>>;
  all: <T = unknown>() => Promise<D1Result<T>>;
  raw: <T = unknown>() => Promise<T[]>;
}

interface D1Result<T = unknown> {
  success: boolean;
  meta: any;
  results: T[];
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// Helper to get local DB path using dynamic imports to avoid Edge crashes
function getLocalDbPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');

    const baseDir = path.join(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
    if (!fs.existsSync(baseDir)) return null;
    
    const files = fs.readdirSync(baseDir);
    const sqliteFile = files.find((f: string) => f.endsWith('.sqlite'));
    return sqliteFile ? path.join(baseDir, sqliteFile) : null;
  } catch {
    return null;
  }
}

export async function queryD1<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  // console.log(`[D1] Executing Query: ${sql.substring(0, 100)}...`);

  // 1. Try D1 Binding (Cloudflare Pages/Workers)
  // Check process.env.DB and globalThis.DB (some environments use global)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bindingDB = (process.env.DB || (globalThis as any).DB) as unknown as D1DatabaseBinding;
  
  if (bindingDB && typeof bindingDB.prepare === 'function') {
    try {
      const stmt = bindingDB.prepare(sql).bind(...params);
      if (sql.trim().toLowerCase().startsWith('select')) {
        const result = await stmt.all<T>();
        return result.results || [];
      } else {
        const result = await stmt.run<T>();
        return [result] as unknown as T[];
      }
    } catch (e) {
      console.error("[D1 Binding Error]", e);
      throw e;
    }
  }

  // 2. Remote HTTP API (Fallback for local dev or non-edge environments if configured)
  if (REMOTE_DB) {
    // console.log("[D1] Using Remote HTTP API");
    if (!ACCOUNT_ID || !DATABASE_ID || !API_TOKEN) {
      // Fallback to wrangler CLI if credentials aren't in env
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { exec } = require('child_process');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        let processedSql = sql;
        params.forEach(param => {
          const escaped = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : (param ?? 'NULL');
          processedSql = processedSql.replace('?', String(escaped));
        });

        const { stdout } = await execAsync(`npx wrangler d1 execute code-campus-db --remote --command="${processedSql.replace(/