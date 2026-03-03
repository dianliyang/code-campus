import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { authorizeExternalRequest } from "@/lib/external-api-auth";

type PlanTaskKind =
  | "lecture"
  | "reading"
  | "assignment"
  | "lab"
  | "project"
  | "quiz"
  | "exam"
  | "task";

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function normalizeKind(input: unknown): PlanTaskKind {
  const v = String(input || "").toLowerCase().trim();
  if (v === "lecture") return "lecture";
  if (v === "reading") return "reading";
  if (v === "assignment") return "assignment";
  if (v === "lab") return "lab";
  if (v === "project") return "project";
  if (v === "quiz") return "quiz";
  if (v === "exam") return "exam";
  return "task";
}

function taskFromItem(
  kind: PlanTaskKind,
  item: Record<string, unknown>,
  fallbackDate: string | null,
  source: "schedule" | "assignment_table"
) {
  const title = String(item.title || item.label || "").trim();
  if (!title) return null;
  return {
    kind,
    title,
    dueOn: toIsoDate(item.due_on) || fallbackDate,
    sequence: typeof item.sequence === "string" ? item.sequence : null,
    url: typeof item.url === "string" ? item.url : null,
    description: typeof item.description === "string" ? item.description : null,
    source,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ course_code: string }> }
) {
  const auth = await authorizeExternalRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { course_code: courseCode } = await params;
  if (!courseCode) {
    return NextResponse.json({ error: "Invalid course_code" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("courses")
      .select(`
        id,
        university,
        course_code,
        title,
        description,
        url,
        resources,
        subdomain,
        details,
        course_fields(
          fields(name)
        ),
        study_plans(
          start_date,
          end_date,
          updated_at
        ),
        course_syllabi(
          source_url,
          schedule,
          retrieved_at,
          updated_at
        ),
        course_assignments(
          kind,
          label,
          due_on,
          url,
          description,
          source_sequence,
          source_row_date,
          updated_at
        ),
        user_courses!inner(status)
      `)
      .neq("user_courses.status", "hidden")
      .eq("course_code", courseCode)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 });
    }
    if (!data || data.user_courses == null) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const studyPlans = Array.isArray(data.study_plans) ? data.study_plans : [];
    const latestPlan = studyPlans
      .filter((p) => typeof p?.start_date === "string")
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0];

    const syllabi = Array.isArray(data.course_syllabi) ? data.course_syllabi : [];
    const syllabus = syllabi[0] || null;
    const scheduleRows = Array.isArray(syllabus?.schedule) ? (syllabus.schedule as Array<Record<string, unknown>>) : [];
    const assignmentRows = Array.isArray(data.course_assignments) ? data.course_assignments : [];

    const lectures: Array<{
      title: string;
      date: string | null;
      sequence: string | null;
      links: string[];
    }> = [];
    const tasks: Array<{
      kind: PlanTaskKind;
      title: string;
      dueOn: string | null;
      sequence: string | null;
      url: string | null;
      description: string | null;
      source: "schedule" | "assignment_table";
    }> = [];

    for (const row of scheduleRows) {
      const title = String(row.title || row.topic || "").trim();
      const rowDate = toIsoDate(row.date);
      const sequence = typeof row.sequence === "string" ? row.sequence : null;
      const links = [
        ...asStringArray((row as Record<string, unknown>).resources),
        ...asStringArray((row as Record<string, unknown>).links),
      ];
      if (title) {
        lectures.push({ title, date: rowDate, sequence, links });
      }

      const groups: Array<[PlanTaskKind, unknown]> = [
        ["reading", row.readings],
        ["assignment", row.assignments],
        ["lab", row.labs],
        ["project", row.projects],
        ["quiz", row.quizzes],
        ["exam", row.exams],
      ];
      for (const [kind, group] of groups) {
        if (!Array.isArray(group)) continue;
        for (const item of group) {
          if (!item || typeof item !== "object") continue;
          const next = taskFromItem(kind, item as Record<string, unknown>, rowDate, "schedule");
          if (next) tasks.push(next);
        }
      }
    }

    for (const row of assignmentRows) {
      const next = taskFromItem(
        normalizeKind(row.kind),
        {
          title: row.label,
          due_on: row.due_on,
          sequence: row.source_sequence,
          url: row.url,
          description: row.description,
        },
        toIsoDate(row.source_row_date),
        "assignment_table"
      );
      if (next) tasks.push(next);
    }

    const seen = new Set<string>();
    const dedupedTasks = tasks.filter((task) => {
      const key = `${task.kind}|${task.title.toLowerCase()}|${task.dueOn || ""}|${task.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const topics = Array.from(
      new Set(
        (Array.isArray(data.course_fields) ? data.course_fields : [])
          .map((row) => {
            const field = (row as Record<string, unknown>).fields as Record<string, unknown> | null;
            return typeof field?.name === "string" ? field.name.trim() : "";
          })
          .filter(Boolean)
      )
    );

    return NextResponse.json({
      success: true,
      course: {
        id: data.id,
        code: data.course_code,
        university: data.university,
        title: data.title,
        description: data.description,
        subdomain: data.subdomain,
        topics,
      },
      planInput: {
        planningWindow: {
          startDate: latestPlan?.start_date ?? null,
          endDate: latestPlan?.end_date ?? null,
          source: latestPlan ? "study_plan" : "default",
        },
        sources: {
          primaryUrl: typeof data.url === "string" ? data.url : null,
          resources: asStringArray(data.resources),
          syllabusSourceUrl: typeof syllabus?.source_url === "string" ? syllabus.source_url : null,
        },
        signals: {
          lectures,
          tasks: dedupedTasks,
        },
        counts: {
          scheduleRows: scheduleRows.length,
          assignments: assignmentRows.length,
          normalizedTasks: dedupedTasks.length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

