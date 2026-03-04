import { ExternalLink } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import ProjectsSeminarsToolbar from "@/components/projects-seminars/ProjectsSeminarsToolbar";
import Link from "next/link";
import ProjectSeminarEnrollButton from "@/components/projects-seminars/ProjectSeminarEnrollButton";
import ProjectsSeminarsDataTable from "@/components/projects-seminars/table/projects-seminars-data-table";
import ProjectsSeminarsPagination from "@/components/projects-seminars/ProjectsSeminarsPagination";
import { ProjectSeminarTableRow } from "@/components/projects-seminars/table/columns";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function readListParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = readParam(params, key);
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ProjectsSeminarsPage({
  searchParams,
}: PageProps) {
  const [params, user, lang] = await Promise.all([
    searchParams,
    getUser(),
    getLanguage(),
  ]);
  const dict = await getDictionary(lang);

  const page = Math.max(1, parseInt(readParam(params, "page") || "1"));
  const allowedPerPage = [12, 24, 48];
  const parsedPerPage = parseInt(readParam(params, "perPage") || "12");
  const perPage = allowedPerPage.includes(parsedPerPage) ? parsedPerPage : 12;
  const offset = (page - 1) * perPage;
  const query = readParam(params, "q");
  const categoriesFilter = readListParam(params, "category");
  const semestersFilter = readListParam(params, "semester");
  const sort = readParam(params, "sort") || "title";
  const view = readParam(params, "view") === "grid" ? "grid" : "list";

  const supabase = await createClient();

  let dataQuery = supabase
    .from("projects_seminars")
    .select(
      "id, title, course_code, category, credit, url, latest_semester, university, details",
      { count: "exact" },
    );

  if (query) {
    dataQuery = dataQuery.textSearch("search_vector", query, {
      type: "websearch",
    });
  }
  if (categoriesFilter.length > 0) {
    dataQuery = dataQuery.in("category", categoriesFilter);
  }
  if (semestersFilter.length > 0) {
    const clauses = semestersFilter
      .map((value) => {
        const [term, yearRaw] = value.split(" ");
        const year = Number(yearRaw);
        if (!term || !Number.isFinite(year)) return null;
        return `and(latest_semester->>term.eq.${term},latest_semester->>year.eq.${year})`;
      })
      .filter((value): value is string => Boolean(value));

    if (clauses.length > 0) {
      dataQuery = dataQuery.or(clauses.join(","));
    }
  }

  if (sort === "newest")
    dataQuery = dataQuery.order("updated_at", { ascending: false });
  else if (sort === "credit")
    dataQuery = dataQuery.order("credit", {
      ascending: false,
      nullsFirst: false,
    });
  else if (sort === "category")
    dataQuery = dataQuery.order("category", { ascending: true });
  else dataQuery = dataQuery.order("title", { ascending: true });

  const [{ data: items, count }, { data: categories }] = await Promise.all([
    dataQuery.range(offset, offset + perPage - 1),
    supabase.from("projects_seminars").select("category, latest_semester"),
  ]);

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const itemIds = (items || []).map((item) => item.id);
  const enrollmentMap = new Map<number, string>();
  const departmentMap = new Map<number, string>();

  if (user && itemIds.length > 0) {
    const { data: enrollmentRows } = await supabase
      .from("user_projects_seminars")
      .select("project_seminar_id, status")
      .eq("user_id", user.id)
      .in("project_seminar_id", itemIds);

    (enrollmentRows || []).forEach((row) => {
      enrollmentMap.set(row.project_seminar_id, row.status || "in_progress");
    });
  }

  if (itemIds.length > 0) {
    const { data: departmentRows } = await supabase
      .from("projects_seminars")
      .select("id, department")
      .in("id", itemIds);
    (departmentRows || []).forEach((row) => {
      if (row.department && row.department.trim()) {
        departmentMap.set(row.id, row.department);
      }
    });
  }

  const uniqueCategories = Array.from(
    new Set(
      (categories || [])
        .map((c) => c.category)
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const uniqueSemesters = Array.from(
    new Set(
      (categories || [])
        .map((c) => {
          const sem = c.latest_semester as {
            term?: string;
            year?: number;
          } | null;
          return sem?.term && sem?.year ? `${sem.term} ${sem.year}` : null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => {
    const [termA, yearA] = a.split(" ");
    const [termB, yearB] = b.split(" ");
    if (yearA !== yearB) return Number(yearB) - Number(yearA);
    const order: Record<string, number> = {
      Winter: 4,
      Fall: 3,
      Summer: 2,
      Spring: 1,
    };
    return (order[termB] || 0) - (order[termA] || 0);
  });

  const tableRows: ProjectSeminarTableRow[] = (items || []).map((item) => {
    const semester = (item.latest_semester || {}) as {
      term?: string;
      year?: number;
    };
    const department = (departmentMap.get(item.id) ||
      (item.details &&
        typeof item.details === "object" &&
        !Array.isArray(item.details) &&
        typeof (item.details as Record<string, unknown>).department ===
          "string" &&
        (item.details as Record<string, unknown>).department) ||
      "-") as string;

    return {
      id: item.id,
      title: item.title || "",
      courseCode: item.course_code || "",
      university: item.university || "",
      category: item.category || "",
      department,
      enrolled: Boolean(enrollmentMap.get(item.id)),
      credit: item.credit ?? null,
      semesterLabel:
        semester.term && semester.year
          ? `${semester.term} ${semester.year}`
          : "-",
      url: item.url || null,
    };
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Seminar & Project
        </h1>
        <p className="text-sm text-muted-foreground">
          Explore projects and seminars with focused filters and fast enrollment.
        </p>
      </div>
      <Separator className="my-3" />
      <ProjectsSeminarsToolbar
        categories={uniqueCategories}
        semesters={uniqueSemesters}
      />
      <Separator className="my-3" />

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "list" ? (
          <div className="h-full overflow-auto">
            <ProjectsSeminarsDataTable rows={tableRows} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(items || []).map((item) => {
            const semester = (item.latest_semester || {}) as {
              term?: string;
              year?: number;
            };
            const status = enrollmentMap.get(item.id)
              ? "Enrolled"
              : "Not Enrolled";
            return (
              <div key={item.id} className="rounded-sm border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                      <Link
                        href={`/projects-seminars/${item.id}`}
                        className="transition-colors hover:text-black"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {item.course_code} · {item.university}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <ProjectSeminarEnrollButton
                      projectSeminarId={item.id}
                      initialEnrolled={Boolean(enrollmentMap.get(item.id))}
                      iconOnly
                    />
                    {item.url ? (
                      <Button variant="outline" size="icon-sm" asChild>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open seminar"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon-sm" disabled>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <span className="inline-flex bg-[#efefef] px-2 py-0.5 text-[11px] font-medium text-[#666]">
                    {item.category}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${
                      status === "Enrolled"
                        ? "bg-green-50 text-green-700"
                        : "bg-[#efefef] text-[#666]"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 pt-3">
                  <div className="flex min-h-[56px] flex-col bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">
                      Credit
                    </p>
                    <p className="mt-auto text-[13px] font-medium text-[#3b3b3b]">
                      {item.credit ?? "-"}
                    </p>
                  </div>
                  <div className="flex min-h-[56px] flex-col bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">
                      Category
                    </p>
                    <p className="mt-auto truncate text-[13px] font-medium text-[#3b3b3b]">
                      {item.category}
                    </p>
                  </div>
                  <div className="flex min-h-[56px] flex-col bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">
                      Semester
                    </p>
                    <p className="mt-auto text-[13px] font-medium text-[#3b3b3b]">
                      {semester.term && semester.year
                        ? `${semester.term} ${semester.year}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}

        {(items || []).length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No No seminars or projects found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : null}
      </div>
      <Separator className="my-3" />
      <ProjectsSeminarsPagination page={page} perPage={perPage} totalPages={totalPages} />
    </div>
  );
}
