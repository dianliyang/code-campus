import { ExternalLink } from "lucide-react";
import Pagination from "@/components/home/Pagination";
import { createAdminClient, createClient, getUser } from "@/lib/supabase/server";
import ProjectsSeminarsToolbar from "@/components/projects-seminars/ProjectsSeminarsToolbar";
import Link from "next/link";
import ProjectSeminarEnrollButton from "@/components/projects-seminars/ProjectSeminarEnrollButton";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function readParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function readListParam(params: Record<string, string | string[] | undefined>, key: string): string[] {
  const value = readParam(params, key);
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default async function ProjectsSeminarsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await getUser();
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
  const admin = createAdminClient();

  let dataQuery = admin
    .from("projects_seminars")
    .select("id, title, course_code, category, credit, url, latest_semester, university, details", { count: "exact" });

  if (query) {
    dataQuery = dataQuery.textSearch("search_vector", query, { type: "websearch" });
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

  if (sort === "newest") dataQuery = dataQuery.order("updated_at", { ascending: false });
  else if (sort === "credit") dataQuery = dataQuery.order("credit", { ascending: false, nullsFirst: false });
  else if (sort === "category") dataQuery = dataQuery.order("category", { ascending: true });
  else dataQuery = dataQuery.order("title", { ascending: true });

  const [{ data: items, count }, { data: categories }] = await Promise.all([
    dataQuery.range(offset, offset + perPage - 1),
    admin.from("projects_seminars").select("category, latest_semester"),
  ]);

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const itemIds = (items || []).map((item) => item.id);
  const enrollmentMap = new Map<number, string>();

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

  const uniqueCategories = Array.from(
    new Set((categories || []).map((c) => c.category).filter((c): c is string => Boolean(c))),
  ).sort((a, b) => a.localeCompare(b));
  const uniqueSemesters = Array.from(
    new Set(
      (categories || [])
        .map((c) => {
          const sem = c.latest_semester as { term?: string; year?: number } | null;
          return sem?.term && sem?.year ? `${sem.term} ${sem.year}` : null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => {
    const [termA, yearA] = a.split(" ");
    const [termB, yearB] = b.split(" ");
    if (yearA !== yearB) return Number(yearB) - Number(yearA);
    const order: Record<string, number> = { Winter: 4, Fall: 3, Summer: 2, Spring: 1 };
    return (order[termB] || 0) - (order[termA] || 0);
  });

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <ProjectsSeminarsToolbar categories={uniqueCategories} semesters={uniqueSemesters} />

        <div className="rounded-lg overflow-hidden bg-[#fcfcfc]">
          {view === "list" ? (
            <>
              <div className="hidden md:flex items-center gap-4 px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] select-none uppercase tracking-wide">
                <div className="flex-1 min-w-0">S&P</div>
                <div className="w-[14%]">Category</div>
                <div className="w-[16%]">Department</div>
                <div className="w-[10%]">Status</div>
                <div className="w-[10%]">Credit</div>
                <div className="w-[12%]">Semester</div>
                <div className="w-[10%] text-right pr-1">Action</div>
              </div>
              <div>
                {(items || []).map((item, idx) => {
                  const semester = (item.latest_semester || {}) as { term?: string; year?: number };
                  const status = enrollmentMap.get(item.id) ? "Enrolled" : "Not Enrolled";
                  return (
                    <article
                      key={item.id}
                      className={`group flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 py-3 transition-colors ${
                        idx % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]"
                      } hover:bg-[#f2f2f2]`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-medium text-[#222] truncate">
                          <Link href={`/projects-seminars/${item.id}`} className="hover:text-black transition-colors">
                            {item.title}
                          </Link>
                        </h3>
                        <p className="text-[12px] text-[#717171] mt-0.5">
                          {item.course_code} · {item.university}
                        </p>
                      </div>
                      <div className="md:w-[14%] text-[12px] text-[#555]">{item.category}</div>
                      <div className="md:w-[16%] text-[12px] text-[#555] truncate">
                        {(
                          (item.details &&
                            typeof item.details === "object" &&
                            !Array.isArray(item.details) &&
                            typeof (item.details as Record<string, unknown>).department === "string" &&
                            (item.details as Record<string, unknown>).department) ||
                          "-"
                        ) as string}
                      </div>
                      <div className="md:w-[10%] text-[12px]">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${status === "Enrolled" ? "border-green-100 bg-green-50 text-green-700" : "border-[#e5e5e5] bg-[#f3f3f3] text-[#666]"}`}>
                          {status}
                        </span>
                      </div>
                      <div className="md:w-[10%] text-[12px] text-[#555]">{item.credit ?? "-"}</div>
                      <div className="md:w-[12%] text-[12px] text-[#555]">
                        {semester.term && semester.year ? `${semester.term} ${semester.year}` : "-"}
                      </div>
                      <div className="md:w-[10%] flex md:justify-end items-center gap-1">
                        <ProjectSeminarEnrollButton projectSeminarId={item.id} initialEnrolled={Boolean(enrollmentMap.get(item.id))} iconOnly />
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white border border-[#d6d6d6] text-[#4f4f4f] hover:bg-[#f4f4f4] transition-colors"
                            aria-label="Open seminar"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-[#ececec] text-[#9a9a9a]">
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
              {(items || []).map((item) => {
                const semester = (item.latest_semester || {}) as { term?: string; year?: number };
                const status = enrollmentMap.get(item.id) ? "Enrolled" : "Not Enrolled";
                return (
                  <article key={item.id} className="bg-[#fafafa] border border-[#e3e3e3] rounded-xl p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
                          <Link href={`/projects-seminars/${item.id}`} className="hover:text-black transition-colors">
                            {item.title}
                          </Link>
                        </h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.course_code} · {item.university}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <ProjectSeminarEnrollButton projectSeminarId={item.id} initialEnrolled={Boolean(enrollmentMap.get(item.id))} iconOnly />
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white border border-[#d6d6d6] text-[#4f4f4f] hover:bg-[#f4f4f4] transition-colors"
                            aria-label="Open seminar"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-[#ececec] text-[#9a9a9a]">
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-medium bg-[#efefef] text-[#666]">
                        {item.category}
                      </span>
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${status === "Enrolled" ? "bg-green-50 text-green-700" : "bg-[#efefef] text-[#666]"}`}>
                        {status}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-white px-2 py-1.5 flex min-h-[56px] flex-col">
                        <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Credit</p>
                        <p className="mt-auto text-[13px] font-medium text-[#3b3b3b]">{item.credit ?? "-"}</p>
                      </div>
                      <div className="rounded-md bg-white px-2 py-1.5 flex min-h-[56px] flex-col">
                        <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Category</p>
                        <p className="mt-auto text-[13px] font-medium text-[#3b3b3b] truncate">{item.category}</p>
                      </div>
                      <div className="rounded-md bg-white px-2 py-1.5 flex min-h-[56px] flex-col">
                        <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Semester</p>
                        <p className="mt-auto text-[13px] font-medium text-[#3b3b3b]">
                          {semester.term && semester.year ? `${semester.term} ${semester.year}` : "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {(items || []).length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-sm font-semibold text-slate-900">No seminars found</h3>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or category filter.</p>
            </div>
          ) : null}
        </div>

        <div className="sticky bottom-0 bg-[#fcfcfc]">
          <Pagination totalPages={totalPages} currentPage={page} totalItems={total} perPage={perPage} />
        </div>
      </div>
    </div>
  );
}
