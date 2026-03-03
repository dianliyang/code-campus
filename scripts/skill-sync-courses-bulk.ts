type ExternalCourse = {
  code?: string;
  university?: string;
};

type Args = {
  baseUrl: string;
  apiKey: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const baseUrlDefault = (process.env.COURSE_API_BASE || process.env.NEXT_PUBLIC_APP_URL || "https://course.oili.dev").replace(/\/$/, "");
  const apiKeyDefault = String(process.env.API_KEY || process.env.INTERNAL_API_KEY || "").trim();
  const out: Args = {
    baseUrl: baseUrlDefault,
    apiKey: apiKeyDefault,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--base-url" && next) {
      out.baseUrl = String(next).trim().replace(/\/$/, "");
      i += 1;
      continue;
    }
    if (token === "--api-key" && next) {
      out.apiKey = String(next).trim();
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      out.dryRun = true;
    }
  }

  return out;
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.apiKey) {
    throw new Error("Missing API key. Provide --api-key or set API_KEY/INTERNAL_API_KEY.");
  }

  console.log(`[bulk-sync] loading courses from ${args.baseUrl}/api/external/courses`);
  const listResult = await fetchJson(`${args.baseUrl}/api/external/courses`, {
    method: "GET",
    headers: {
      "x-api-key": args.apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!listResult.res.ok) {
    throw new Error(`Failed to load courses (${listResult.res.status}): ${JSON.stringify(listResult.json)}`);
  }

  const payload = (listResult.json && typeof listResult.json === "object") ? (listResult.json as Record<string, unknown>) : {};
  const allCourses = Array.isArray(payload.courses) ? (payload.courses as ExternalCourse[]) : [];
  const targetCourses = allCourses.filter((course) => {
    const uni = String(course.university || "").toLowerCase();
    return !uni.includes("cau");
  });

  console.log(`[bulk-sync] found=${allCourses.length} target=${targetCourses.length} excluded_cau=${allCourses.length - targetCourses.length}`);
  if (args.dryRun) {
    for (const course of targetCourses) {
      console.log(`[bulk-sync][dry-run] ${course.university || "Unknown"} ${course.code || ""}`.trim());
    }
    return;
  }

  let okCount = 0;
  let failCount = 0;
  for (let idx = 0; idx < targetCourses.length; idx += 1) {
    const course = targetCourses[idx];
    const code = String(course.code || "").trim();
    if (!code) continue;

    console.log(`[bulk-sync] (${idx + 1}/${targetCourses.length}) syncing ${course.university || "Unknown"} ${code}`);
    const syncResult = await fetchJson(`${args.baseUrl}/api/external/courses/${encodeURIComponent(code)}/sync`, {
      method: "POST",
      headers: {
        "x-api-key": args.apiKey,
        "content-type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fastMode: false,
        executionMode: "deterministic",
        sourceMode: "fresh",
      }),
    });
    if (syncResult.res.ok) {
      okCount += 1;
      console.log(`[bulk-sync] ok ${code}`);
    } else {
      failCount += 1;
      console.log(`[bulk-sync] fail ${code} status=${syncResult.res.status} body=${JSON.stringify(syncResult.json)}`);
    }
  }

  console.log(`[bulk-sync] done ok=${okCount} fail=${failCount}`);
  if (failCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[bulk-sync] error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
