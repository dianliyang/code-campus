import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import ProjectSeminarEnrollButton from "@/components/projects-seminars/ProjectSeminarEnrollButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return "";
}

function extractContentLinks(input: string): string[] {
  const links: string[] = [];
  const text = input || "";

  text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, _label: string, url: string) => {
    const normalized = normalizeUrl(url);
    if (normalized) links.push(normalized);
    return _;
  });

  text.replace(/((?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi, (match: string) => {
    const normalized = normalizeUrl(match);
    if (normalized) links.push(normalized);
    return match;
  });

  return Array.from(new Set(links));
}

function getLinkLabel(link: string): string {
  try {
    const parsed = new URL(link);
    const host = parsed.hostname.replace(/^www\./i, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${host}${path}`.slice(0, 80);
  } catch {
    return link.slice(0, 80);
  }
}

export default async function ProjectsSeminarsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  const { data: modernData, error: modernError } = await supabase
    .from("projects_seminars")
    .select(
      "id, title, course_code, category, credit, url, latest_semester, university, description, contents, department, prerequisites, schedule, instructors, related_links, details",
    )
    .eq("id", Number(id))
    .single();

  let data: Record<string, unknown> | null = modernData as Record<string, unknown> | null;
  if (modernError || !modernData) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("projects_seminars")
      .select(
        "id, title, course_code, category, credit, url, latest_semester, university, description, instructors, details",
      )
      .eq("id", Number(id))
      .single();
    if (legacyError || !legacyData) notFound();
    data = legacyData as Record<string, unknown>;
  }
  if (!data) notFound();

  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from("user_projects_seminars")
      .select("project_seminar_id")
      .eq("user_id", user.id)
      .eq("project_seminar_id", Number(data.id))
      .maybeSingle();
    isEnrolled = Boolean(enrollment);
  }

  const row = data as Record<string, unknown>;
  const details =
    row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : {};
  const latestSemester = (row.latest_semester || {}) as { term?: string; year?: number };
  const semesterLabel = latestSemester.term && latestSemester.year ? `${latestSemester.term} ${latestSemester.year}` : "-";
  const department =
    ((typeof row.department === "string" && row.department.trim()) ||
      (typeof details.department === "string" && details.department.trim()) ||
      "-") as string;
  const prereqOrg =
    ((typeof row.prerequisites === "string" && row.prerequisites.trim()) ||
      (typeof details.prerequisites === "string" && details.prerequisites.trim()) ||
      (typeof details.prerequisites_organisational_information === "string" &&
        details.prerequisites_organisational_information.trim()) ||
      "-") as string;
  const contents =
    ((typeof row.contents === "string" && row.contents.trim()) ||
      (typeof row.description === "string" && row.description.trim()) ||
      (typeof details.contents === "string" && details.contents.trim()) ||
      "-") as string;
  const contentLinks = extractContentLinks(contents);
  const schedule =
    row.schedule && typeof row.schedule === "object" && !Array.isArray(row.schedule)
      ? (row.schedule as Record<string, string[]>)
      : details.schedule && typeof details.schedule === "object" && !Array.isArray(details.schedule)
        ? (details.schedule as Record<string, string[]>)
        : {};
  const scheduleRows = Object.entries(schedule).flatMap(([kind, values]) =>
    (values || []).map((line) => ({ kind, line })),
  );
  const savedRelatedLinks = Array.isArray(row.related_links)
    ? row.related_links.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : Array.isArray(details.resources)
      ? details.resources.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
  const relatedLinks = Array.from(
    new Set(
      [typeof row.url === "string" ? row.url : "", ...savedRelatedLinks, ...contentLinks].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );

  return (
    <div className="h-full overflow-hidden px-4 py-4">
      <header className="z-10 border-b bg-background md:sticky md:top-0">
        <div className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-semibold tracking-tight text-foreground">
              {String(row.title || "")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(row.university || "")} {String(row.course_code || "")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSeminarEnrollButton projectSeminarId={Number(row.id)} initialEnrolled={isEnrolled} />
            {typeof row.url === "string" && row.url ? (
              <Button variant="outline" asChild>
                <a href={row.url} target="_blank" rel="noreferrer">
                  Open
                  <ExternalLink />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid h-[calc(100%-92px)] grid-cols-1 overflow-hidden lg:grid-cols-12">
        <section className="min-h-0 overflow-y-auto py-4 lg:col-span-8 lg:pr-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{contents}</p>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold tracking-tight">Prerequisites</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{prereqOrg}</p>
            </div>

            <Separator />

            <div>
              <h2 className="text-lg font-semibold tracking-tight">Schedule</h2>
              {scheduleRows.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {scheduleRows.map((scheduleRow, idx) => (
                    <p key={`${scheduleRow.kind}-${idx}`} className="text-sm text-muted-foreground">
                      <span className="mr-2 text-xs font-medium uppercase tracking-wide text-foreground">
                        {scheduleRow.kind}
                      </span>
                      {scheduleRow.line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l py-4 lg:col-span-4 lg:pl-4">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Seminar Facts</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd>{String(row.category || "-")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd>{department}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Credit</dt>
                  <dd>{(row.credit as number | null) ?? "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Semester</dt>
                  <dd>{semesterLabel}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <Badge variant="secondary">{isEnrolled ? "Enrolled" : "Not Enrolled"}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold tracking-tight">Related Links</h3>
              {relatedLinks.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {relatedLinks.map((link, idx) => (
                    <li key={`${link}-${idx}`}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-sm border px-3 py-2 text-sm text-foreground"
                        title={link}
                      >
                        <span className="truncate">{getLinkLabel(link)}</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
