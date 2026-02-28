import { Suspense } from "react";
import { Course } from "@/types";
import ActiveCourseTrack from "@/components/home/ActiveCourseTrack";
import StudyPlanHeader from "@/components/home/StudyPlanHeader";
import StudyCalendar from "@/components/home/StudyCalendar";
import UniversityIcon from "@/components/common/UniversityIcon";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { calculateAttendance } from "@/lib/attendance";
import { Ghost } from "lucide-react";

export const dynamic = "force-dynamic";

interface EnrolledCourse extends Course {
  status: string;
  progress: number;
  updated_at: string;
  gpa?: number;
  score?: number;
  attendance?: { attended: number; total: number };
}

interface EnrolledProjectSeminar {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  category: string;
  url: string | null;
  semesterLabel: string;
  status: string;
  progress: number;
  updated_at: string;
}

export default async function StudyPlanPage() {
  const [user, lang] = await Promise.all([
    getUser(),
    getLanguage(),
  ]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.profile.user_not_found}</p>
        <Button asChild className="mt-8"><Link href="/login">{dict.dashboard.login.title}</Link></Button>
      </div>
    );
  }

  return (
    <main className="w-full">
      <Suspense fallback={<StudyPlanSkeleton />}>
        <StudyPlanContent userId={user.id} dict={dict} />
      </Suspense>
    </main>
  );
}

async function StudyPlanContent({
  userId, dict
}: {
  userId: string;
  dict: Dictionary;
}) {
  const supabase = await createClient();

  // Parallelize all DB fetches
  const [coursesRes, plansRes, logsRes, projectsSeminarsRes] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        id, university, course_code, title, units, credit, url, description, details, is_hidden,
        uc:user_courses!inner(status, progress, updated_at, gpa, score),
        semesters:course_semesters(semesters(term, year))
      `)
      .eq('user_courses.user_id', userId)
      .neq('user_courses.status', 'hidden')
      .order('updated_at', { foreignTable: 'user_courses', ascending: false }),
    
    supabase
      .from('study_plans')
      .select(`
        id,
        course_id,
        start_date,
        end_date,
        days_of_week,
        start_time,
        end_time,
        location,
        kind,
        courses(id, title, course_code, university)
      `)
      .eq('user_id', userId),

    supabase
      .from('study_logs')
      .select('*')
      .eq('user_id', userId),

    supabase
      .from('projects_seminars')
      .select(`
        id, university, course_code, title, category, url, latest_semester,
        ups:user_projects_seminars!inner(status, progress, updated_at)
      `)
      .eq('user_projects_seminars.user_id', userId)
      .order('updated_at', { foreignTable: 'user_projects_seminars', ascending: false })
  ]);

  if (coursesRes.error) {
    console.error("[Supabase] Study plan courses fetch error:", coursesRes.error);
  }
  if (projectsSeminarsRes.error) {
    console.error("[Supabase] Study plan project/seminar fetch error:", projectsSeminarsRes.error);
  }

  const enrolledRows = coursesRes.data || [];
  const enrolledProjectSeminarRows = projectsSeminarsRes.data || [];
  const rawPlans = plansRes.data || [];
  const logs = logsRes.data || [];

  const enrolledCourses: EnrolledCourse[] = enrolledRows.map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const semesterNames = (row.semesters as { semesters: { term: string; year: number } }[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const uc = (row.uc as { status: string, progress: number, updated_at: string, gpa?: number, score?: number }[] | null)?.[0] ||
               (row.user_courses as { status: string, progress: number, updated_at: string, gpa?: number, score?: number }[] | null)?.[0];

    return {
      ...course,
      fields: [],
      semesters: semesterNames,
      status: uc?.status || 'pending',
      progress: uc?.progress || 0,
      updated_at: uc?.updated_at || new Date().toISOString(),
      gpa: uc?.gpa,
      score: uc?.score,
    } as EnrolledCourse;
  });

  const enrolledProjectsSeminars: EnrolledProjectSeminar[] = enrolledProjectSeminarRows.map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const ups = (row.ups as { status: string; progress: number; updated_at: string }[] | null)?.[0] ||
      (row.user_projects_seminars as { status: string; progress: number; updated_at: string }[] | null)?.[0];
    const latestSemester = row.latest_semester as { term?: string; year?: number } | null;
    const semesterLabel = latestSemester?.term && latestSemester?.year
      ? `${latestSemester.term} ${latestSemester.year}`
      : "N/A";

    return {
      id: row.id,
      title: row.title || "",
      courseCode: row.course_code || "",
      university: row.university || "",
      category: row.category || "",
      url: row.url || null,
      semesterLabel,
      status: ups?.status || "in_progress",
      progress: ups?.progress || 0,
      updated_at: ups?.updated_at || new Date().toISOString(),
    };
  });

  const toDateOnly = (value: unknown) => {
    if (typeof value !== "string") return "";
    return value.includes("T") ? value.split("T")[0] : value;
  };

  const normalizeDays = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((d) => (typeof d === "number" ? d : Number(d)))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPlans = rawPlans.map((plan: any) => ({
    ...plan,
    courses: Array.isArray(plan.courses) ? plan.courses[0] : plan.courses,
    start_date: toDateOnly(plan.start_date),
    end_date: toDateOnly(plan.end_date),
    days_of_week: normalizeDays(plan.days_of_week),
  }));

  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const plans = allPlans.filter((plan: { course_id: number }) => enrolledCourseIds.has(plan.course_id));
  const validPlanIds = new Set(plans.map((plan: { id: number }) => plan.id));
  const filteredLogs = (logs || []).filter((log: { plan_id: number }) => validPlanIds.has(log.plan_id));

  // Identify CAU courses that have schedule data but no study plans yet
  const courseIdsWithPlans = new Set(plans.map((p: { course_id: number }) => p.course_id));
  const coursesWithoutPlans = enrolledCourses
    .filter(c =>
      c.university === 'CAU Kiel' &&
      !courseIdsWithPlans.has(c.id) &&
      c.details?.schedule &&
      typeof c.details.schedule === 'object' &&
      Object.keys(c.details.schedule as Record<string, unknown>).length > 0
    )
    .map(c => ({ id: c.id, courseCode: c.courseCode, title: c.title }));

  const enrolledWithAttendance = enrolledCourses.map(course => {
    const coursePlans = plans?.filter((p: { course_id: number }) => p.course_id === course.id) || [];
    // logs are already filtered by user_id, now filter by plans belonging to this course
    const planIds = coursePlans.map((p: { id: number }) => p.id);
    const courseLogs = filteredLogs.filter((l: { plan_id: number }) => planIds.includes(l.plan_id));
    
    const { attended, total } = calculateAttendance(coursePlans, courseLogs);

    return {
      ...course,
      attendance: { attended, total }
    };
  });

  const totalAttended = enrolledWithAttendance.reduce((acc, course) => {
    if (course.status === 'in_progress' || course.status === 'completed') {
      return acc + (course.attendance?.attended || 0);
    }
    return acc;
  }, 0);

  const totalSessions = enrolledWithAttendance.reduce((acc, course) => {
    if (course.status === 'in_progress' || course.status === 'completed') {
      return acc + (course.attendance?.total || 0);
    }
    return acc;
  }, 0);

  const inProgress = enrolledWithAttendance.filter(c => c.status === 'in_progress');
  const inProgressProjectsSeminars = enrolledProjectsSeminars.filter((item) => item.status === 'in_progress');
  const completed = enrolledWithAttendance.filter(c => c.status === 'completed' && !c.isHidden);

  const totalCredits = completed.reduce((acc, course) => {
    return acc + (course.credit || 0);
  }, 0);

  return (
    <div className="space-y-4">
      <StudyPlanHeader
        enrolledCount={enrolledCourses.length + enrolledProjectsSeminars.length}
        completedCount={completed.length}
        totalCredits={totalCredits}
        attendance={{ attended: totalAttended, total: totalSessions }}
        dict={dict.dashboard.roadmap}
      />

      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3 sm:p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1f1f1f]">{dict.dashboard.roadmap.calendar_title}</h3>
        </div>
        <StudyCalendar
          courses={enrolledCourses}
          plans={plans}
          logs={filteredLogs}
          dict={dict.dashboard.roadmap}
          coursesWithoutPlans={coursesWithoutPlans}
        />
      </section>

      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3 sm:p-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1f1f1f]">{dict.dashboard.roadmap.phase_1_title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {inProgress.length > 0 && inProgress.map(course => (
            <ActiveCourseTrack
              key={`course-${course.id}`}
              course={course}
              initialProgress={course.progress}
              plan={plans.find((p: { course_id: number }) => p.course_id === course.id)}
            />
          ))}
          {inProgressProjectsSeminars.length > 0 && inProgressProjectsSeminars.map((item) => (
            <ActiveProjectSeminarTrack key={`project-seminar-${item.id}`} item={item} />
          ))}
          {inProgress.length === 0 && inProgressProjectsSeminars.length === 0 && (
            <p className="text-sm text-[#8a8a8a]">{dict.dashboard.roadmap.no_active}</p>
          )}
        </div>
      </section>

      {enrolledCourses.length === 0 && enrolledProjectsSeminars.length === 0 && (
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] py-16 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white">
            <Ghost className="w-4 h-4 text-[#b0b0b0]" />
          </div>
          <h2 className="text-sm font-medium text-[#2f2f2f] mb-2">{dict.dashboard.roadmap.null_path}</h2>
          <p className="text-xs text-[#7a7a7a] max-w-[380px] leading-relaxed mb-6 mx-auto">
            {dict.dashboard.roadmap.empty_desc}
          </p>
          <Button asChild><Link href="/courses">{dict.dashboard.roadmap.empty_cta}</Link></Button>
        </div>
      )}
    </div>
  );
}

function ActiveProjectSeminarTrack({ item }: { item: EnrolledProjectSeminar }) {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-md p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <UniversityIcon
            name={item.university}
            size={32}
            className="flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-1"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium text-[#4d4d4d] leading-none">{item.university}</span>
              <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
              <span className="text-[11px] text-[#9a9a9a]">{item.courseCode}</span>
            </div>
            <h3 className="text-sm font-semibold text-[#1f1f1f] tracking-tight leading-tight line-clamp-1">
              <Link href={`/projects-seminars/${item.id}`}>{item.title}</Link>
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center rounded-md border border-[#e5e5e5] bg-[#f8f8f8] px-2 py-0.5 text-[10px] font-medium text-[#555]">
          {item.category || "Project/Seminar"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f0f0f0]">
        <div className="rounded-md bg-[#fafafa] border border-[#efefef] px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-[#9a9a9a]">Semester</p>
          <p className="text-[11px] text-[#2f2f2f]">{item.semesterLabel}</p>
        </div>
        <div className="rounded-md bg-[#fafafa] border border-[#efefef] px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-[#9a9a9a]">Status</p>
          <p className="text-[11px] text-[#2f2f2f]">In Progress</p>
        </div>
      </div>
    </div>
  );
}

function StudyPlanSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Stats strip — mirrors StudyPlanHeader grid */}
      <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] grid grid-cols-2 lg:grid-cols-4">
        <div className="px-4 py-3 border-r border-b lg:border-b-0 border-[#e5e5e5]">
          <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
        </div>
        <div className="px-4 py-3 border-b lg:border-b-0 lg:border-r border-[#e5e5e5]">
          <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
        </div>
        <div className="px-4 py-3 border-r border-[#e5e5e5]">
          <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
        </div>
        <div className="px-4 py-3">
          <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
        </div>
      </div>
      {/* Calendar section */}
      <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
        <div className="h-4 w-40 bg-[#f0f0f0] rounded" />
        <div className="h-48 bg-[#f5f5f5] rounded-lg" />
      </div>
      {/* Active courses section */}
      <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
        <div className="h-4 w-32 bg-[#f0f0f0] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="h-28 bg-[#f5f5f5] rounded-lg" />
          <div className="h-28 bg-[#f5f5f5] rounded-lg" />
          <div className="h-28 bg-[#f5f5f5] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
