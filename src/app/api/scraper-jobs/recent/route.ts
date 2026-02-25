import { NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("id, university, semester, status, job_type, triggered_by, force_update, started_at, completed_at, duration_ms, course_count, error, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [] });
}

