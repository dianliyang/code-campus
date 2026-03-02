/* eslint-disable no-console */

type ExternalCourse = {
  code?: string;
  university?: string;
};

type SyncStatus = {
  syncPolicy?: {
    skip?: boolean;
    private?: boolean;
    reason?: string | null;
  };
};

const BASE_URL = process.env.COURSE_API_BASE_URL || 'https://course.oili.dev';
const API_KEY = process.env.INTERNAL_API_KEY || '';
// Exclusions should be persisted in DB (syncPolicy/private tags), not env config.

if (!API_KEY) {
  console.error('Missing INTERNAL_API_KEY in environment.');
  process.exit(1);
}

function enc(code: string) {
  return encodeURIComponent(code);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'x-api-key': API_KEY,
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${JSON.stringify(json)}`);
  }
  return json as T;
}

async function main() {
  const list = await api<{ courses?: ExternalCourse[] }>('/api/external/courses');
  const all = Array.isArray(list.courses) ? list.courses : [];

  const candidates = all.filter((c) => String(c.code || '').trim().length > 0);

  console.log(`total=${all.length} candidates=${candidates.length}`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += 1) {
    const code = String(candidates[i].code);
    const status: SyncStatus | null = await api<SyncStatus>(`/api/external/courses/${enc(code)}/sync`).catch(() => null);

    if (status?.syncPolicy?.skip || status?.syncPolicy?.private) {
      skipped += 1;
      console.log(`[${i + 1}/${candidates.length}] ${code} | SKIP | ${status.syncPolicy?.reason || 'private'}`);
      continue;
    }

    const started = Date.now();
    try {
      const out = await api<{ success?: boolean; skipped?: boolean; reason?: string; sync?: { totalMs?: number; assignmentsCount?: number; scheduleEntries?: number } }>(
        `/api/external/courses/${enc(code)}/sync`,
        { method: 'POST', body: JSON.stringify({ fastMode: true }) }
      );

      const elapsed = Date.now() - started;
      if (out.skipped) {
        skipped += 1;
        console.log(`[${i + 1}/${candidates.length}] ${code} | SKIP | ${out.reason || 'private'} | elapsed=${elapsed}ms`);
      } else {
        ok += 1;
        console.log(
          `[${i + 1}/${candidates.length}] ${code} | OK | elapsed=${elapsed}ms totalMs=${out.sync?.totalMs ?? '-'} assignments=${out.sync?.assignmentsCount ?? '-'} schedule=${out.sync?.scheduleEntries ?? '-'}`
        );
      }
    } catch (e) {
      failed += 1;
      console.log(`[${i + 1}/${candidates.length}] ${code} | FAIL | ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`SUMMARY ok=${ok} skipped=${skipped} failed=${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
