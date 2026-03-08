import { createClient, getUser } from "@/lib/supabase/server";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";
import ProjectsSeminarsToolbar from "@/components/projects-seminars/ProjectsSeminarsToolbar";
import { ProjectSeminarTableRow } from "@/components/projects-seminars/table/columns";
import ProjectsSeminarsInfiniteContent from "@/components/projects-seminars/ProjectsSeminarsInfiniteContent";

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
  const [params, user] = await Promise.all([
    searchParams,
    getUser(),
  ]);

  const page = Math.max(1, parseInt(readParam(params, "page") || "1"));
  const allowedPerPage = [20];
  const parsedPerPage = parseInt(readParam(params, "perPage") || "20");
  const perPage = allowedPerPage.includes(parsedPerPage) ? parsedPerPage : 20;
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
    <div className="flex h-full min-h-0 flex-col px-4 pb-4">
      <div className={getDashboardPageHeaderClassName()}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Seminar & Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore projects and seminars with focused filters and fast enrollment.
          </p>
        </div>
      </div>
      <ProjectsSeminarsToolbar
        categories={uniqueCategories}
        semesters={uniqueSemesters}
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        {(items || []).length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No No seminars or projects found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : (
          <ProjectsSeminarsInfiniteContent
            initialRows={tableRows}
            initialGridItems={(items || []).map((item) => ({
              id: item.id,
              title: item.title || "",
              course_code: item.course_code || "",
              university: item.university || "",
              category: item.category || "",
              credit: item.credit ?? null,
              url: item.url || null,
              latest_semester: item.latest_semester || null,
              enrolled: Boolean(enrollmentMap.get(item.id)),
            }))}
            initialPage={page}
            totalPages={totalPages}
            perPage={perPage}
            view={view}
          />
        )}
      </div>
    </div>
  );
}
