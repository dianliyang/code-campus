import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import ProjectSeminarContentsPanel from "@/components/projects-seminars/ProjectSeminarContentsPanel";
import ProjectSeminarEnrollButton from "@/components/projects-seminars/ProjectSeminarEnrollButton";

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

  const { data, error } = await supabase
    .from("projects_seminars")
    .select("id, title, course_code, category, credit, url, latest_semester, university, description, contents, department, prerequisites, schedule, instructors, related_links")
    .eq("id", Number(id))
    .single();

  if (error || !data) {
    notFound();
  }

  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from("user_projects_seminars")
      .select("project_seminar_id")
      .eq("user_id", user.id)
      .eq("project_seminar_id", data.id)
      .maybeSingle();
    isEnrolled = Boolean(enrollment);
  }

  const latestSemester = (data.latest_semester || {}) as { term?: string; year?: number };
  const semesterLabel = latestSemester.term && latestSemester.year ? `${latestSemester.term} ${latestSemester.year}` : "-";
  const department = data.department || "-";
  const prereqOrg = data.prerequisites || "-";
  const contents = data.contents || data.description || "-";
  const contentLinks = extractContentLinks(contents);
  const schedule =
    data.schedule && typeof data.schedule === "object" && !Array.isArray(data.schedule)
      ? (data.schedule as Record<string, string[]>)
      : {};
  const scheduleRows = Object.entries(schedule).flatMap(([kind, values]) =>
    (values || []).map((line) => ({ kind, line })),
  );
  const savedRelatedLinks = Array.isArray(data.related_links)
    ? data.related_links.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const relatedLinks = Array.from(new Set([data.url, ...savedRelatedLinks, ...contentLinks].filter((value): value is string => Boolean(value))));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-[#777]">{data.course_code} · {data.university}</p>
            <h1 className="mt-1 text-[28px] md:text-[32px] font-semibold text-[#1f1f1f] tracking-tight leading-tight break-words">{data.title}</h1>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-4">
          <ProjectSeminarContentsPanel projectSeminarId={data.id} initialContents={contents} />

          <div>
            <h2 className="text-base font-semibold text-[#2a2a2a] mb-2">Prerequisites / Organisational information</h2>
            <p className="text-sm text-[#444] whitespace-pre-wrap leading-relaxed">{prereqOrg}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#2a2a2a] mb-2">Schedule</h2>
            {scheduleRows.length > 0 ? (
              <div className="rounded-md border border-[#e7e7e7] bg-white px-3 py-2">
                {scheduleRows.map((row, idx) => (
                  <p key={`${row.kind}-${idx}`} className="text-sm text-[#333] leading-relaxed">
                    <span className="text-[11px] uppercase tracking-wide text-[#7a7a7a] mr-2">{row.kind}</span>
                    {row.line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#777]">-</p>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="sticky top-0 space-y-4">
            <div className="space-y-3 rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#666]">Your Status</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isEnrolled ? "bg-green-50 text-green-700 border-green-100" : "bg-[#f3f3f3] text-[#666] border-[#e5e5e5]"}`}>
                  {isEnrolled ? "Enrolled" : "Not Enrolled"}
                </span>
              </div>
              <ProjectSeminarEnrollButton projectSeminarId={data.id} initialEnrolled={isEnrolled} />
              {data.url ? (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center justify-center w-full gap-2 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
                >
                  <span>Visit Course Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#777]" />
                </a>
              ) : null}
            </div>

            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h2 className="text-base font-semibold text-[#2a2a2a] mb-3">Facts</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#666]">Category</dt>
                  <dd className="text-right text-[#222]">{data.category || "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#666]">Department</dt>
                  <dd className="text-right text-[#222]">{department}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#666]">Credit</dt>
                  <dd className="text-right text-[#222]">{data.credit ?? "-"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#666]">Semester</dt>
                  <dd className="text-right text-[#222]">{semesterLabel}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-[#666]">Instructors</dt>
                  <dd className="text-[#222]">
                    {(data.instructors || []).length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1">
                        {(data.instructors || []).map((name, idx) => (
                          <li key={`${name}-${idx}`}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-base font-semibold text-[#2a2a2a] mb-2">Related Links</h3>
              {relatedLinks.length > 0 ? (
                <ul className="space-y-2">
                  {relatedLinks.map((link, idx) => (
                    <li key={`${link}-${idx}`}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between gap-2 rounded-md border border-[#e7e7e7] bg-white px-2.5 py-2 text-sm text-[#2e5fa8] hover:border-[#d7d7d7] hover:bg-[#fbfbfb] transition-colors"
                        title={link}
                      >
                        <span className="truncate">{getLinkLabel(link)}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#6a6a6a] group-hover:text-[#333]" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#777]">-</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
