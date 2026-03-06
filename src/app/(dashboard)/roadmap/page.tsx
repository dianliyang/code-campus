import { Suspense } from "react";
import { Course } from "@/types";
import ActiveCourseTrack from "@/components/home/ActiveCourseTrack";
import UniversityIcon from "@/components/common/UniversityIcon";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { calculateAttendance } from "@/lib/attendance";
import { groupRoadmapCoursesByPlan } from "@/lib/roadmap-groups";
import { ExternalLink, Ghost } from "lucide-react";
import CourseIntelSyncWindow from "@/components/home/CourseIntelSyncWindow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface EnrolledCourse extends Course {
  status: string;
  progress: number;
  updated_at: string;
  gpa?: number;
  score?: number;
  attendance?: {attended: number;total: number;};
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
  getLanguage()]
  );
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.identity.user_not_found}</p>
        <Button variant="outline" asChild><Link href="/login">{dict.dashboard.login.title}</Link></Button>
      </div>);

  }

  return (
    <main className="h-full w-full px-4 pb-4">
      <div className="px-4 pb-5 pt-4 -mx-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">
            Track active courses, projects, schedule coverage, and completion momentum.
          </p>
        </div>
      </div>
      <Suspense fallback={null}>
        <StudyPlanContent userId={user.id} dict={dict} />
      </Suspense>
    </main>);

}

async function StudyPlanContent({
  userId, dict



}: {userId: string;dict: Dictionary;}) {
  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Parallelize all DB fetches
  const [coursesRes, plansRes, logsRes, projectsSeminarsRes] = await Promise.all([
  supabase.
  from('courses').
  select(`
        id, university, course_code, title, units, credit, url, details, is_hidden,
        uc:user_courses!inner(status, progress, updated_at, gpa, score),
        semesters:course_semesters(semesters(term, year)),
        course_assignments(id),
        course_syllabi(id, schedule, content)
      `).
  eq('user_courses.user_id', userId).
  neq('user_courses.status', 'hidden').
  order('updated_at', { foreignTable: 'user_courses', ascending: false }),

  supabase.
  from('study_plans').
  select(`
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
      `).
  eq('user_id', userId),

  supabase.
  from('study_logs').
  select('*').
  eq('user_id', userId),

  supabase.
  from('projects_seminars').
  select(`
        id, university, course_code, title, category, url, latest_semester,
        ups:user_projects_seminars!inner(status, progress, updated_at)
      `).
  eq('user_projects_seminars.user_id', userId).
  order('updated_at', { foreignTable: 'user_projects_seminars', ascending: false })]
  );

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

  const toRows = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") return [value as T];
    return [];
  };

  const enrolledCourses: EnrolledCourse[] = enrolledRows.map((row: any) => {// eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const semesterNames = (row.semesters as {semesters: {term: string;year: number;};}[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const uc = (row.uc as {status: string;progress: number;updated_at: string;gpa?: number;score?: number;}[] | null)?.[0] ||
    (row.user_courses as {status: string;progress: number;updated_at: string;gpa?: number;score?: number;}[] | null)?.[0];

    const assignmentRows = toRows<{id: number;}>(row.course_assignments);
    const syllabusRows = toRows<{id: number;schedule?: unknown;content?: unknown;}>(row.course_syllabi);
    const syllabus = syllabusRows.length > 0 ? syllabusRows[0] as {schedule?: unknown;content?: unknown;} : null;
    const syllabusScheduleEntries = Array.isArray(syllabus?.schedule) ? syllabus.schedule.length : 0;
    const content = syllabus?.content && typeof syllabus.content === "object" ? syllabus.content as Record<string, unknown> : {};
    const intel = content.course_intel && typeof content.course_intel === "object" ? content.course_intel as Record<string, unknown> : {};
    const practicalPlan = intel.practical_plan && typeof intel.practical_plan === "object" ? intel.practical_plan as Record<string, unknown> : {};
    const practicalDaysRaw = Array.isArray(practicalPlan.days) ? practicalPlan.days : [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const practicalDays = practicalDaysRaw.
    filter((day): day is Record<string, unknown> => Boolean(day) && typeof day === "object").
    map((day) => ({
      date: typeof day.date === "string" ? day.date : "",
      focus: typeof day.focus === "string" ? day.focus : ""
    })).
    filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && day.date >= todayIso).
    sort((a, b) => a.date.localeCompare(b.date));
    const nextPlanDay = practicalDays[0] || null;

    return {
      ...course,
      fields: [],
      semesters: semesterNames,
      status: uc?.status || 'pending',
      progress: uc?.progress || 0,
      updated_at: uc?.updated_at || new Date().toISOString(),
      gpa: uc?.gpa,
      score: uc?.score,
      assignmentsCount: assignmentRows.length,
      hasSyllabus: syllabusRows.length > 0,
      syllabusScheduleEntries,
      aiPlanSummary: {
        nextDate: nextPlanDay?.date || null,
        nextFocus: nextPlanDay?.focus || null,
        days: practicalDays.length
      }
    } as EnrolledCourse;
  });

  const enrolledProjectsSeminars: EnrolledProjectSeminar[] = enrolledProjectSeminarRows.map((row: any) => {// eslint-disable-line @typescript-eslint/no-explicit-any
    const ups = (row.ups as {status: string;progress: number;updated_at: string;}[] | null)?.[0] ||
    (row.user_projects_seminars as {status: string;progress: number;updated_at: string;}[] | null)?.[0];
    const latestSemester = row.latest_semester as {term?: string;year?: number;} | null;
    const semesterLabel = latestSemester?.term && latestSemester?.year ?
    `${latestSemester.term} ${latestSemester.year}` :
    "N/A";

    return {
      id: row.id,
      title: row.title || "",
      courseCode: row.course_code || "",
      university: row.university || "",
      category: row.category || "",
      description: row.description || null,
      url: row.url || null,
      semesterLabel,
      status: ups?.status || "in_progress",
      progress: ups?.progress || 0,
      updated_at: ups?.updated_at || new Date().toISOString()
    };
  });

  const toDateOnly = (value: unknown) => {
    if (typeof value !== "string") return "";
    return value.includes("T") ? value.split("T")[0] : value;
  };

  const normalizeDays = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value.
    map((d) => typeof d === "number" ? d : Number(d)).
    filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPlans = rawPlans.map((plan: any) => ({
    ...plan,
    courses: Array.isArray(plan.courses) ? plan.courses[0] : plan.courses,
    start_date: toDateOnly(plan.start_date),
    end_date: toDateOnly(plan.end_date),
    days_of_week: normalizeDays(plan.days_of_week)
  }));

  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const plans = allPlans.filter((plan: {course_id: number;}) => enrolledCourseIds.has(plan.course_id));
  const validPlanIds = new Set(plans.map((plan: {id: number;}) => plan.id));
  const filteredLogs = (logs || []).filter((log: {plan_id: number;}) => validPlanIds.has(log.plan_id));

  const enrolledWithAttendance = enrolledCourses.map((course) => {
    const coursePlans = plans?.filter((p: {course_id: number;}) => p.course_id === course.id) || [];
    // logs are already filtered by user_id, now filter by plans belonging to this course
    const planIds = coursePlans.map((p: {id: number;}) => p.id);
    const courseLogs = filteredLogs.filter((l: {plan_id: number;}) => planIds.includes(l.plan_id));

    const { attended, total } = calculateAttendance(coursePlans, courseLogs);

    return {
      ...course,
      attendance: { attended, total }
    };
  });

  const inProgress = enrolledWithAttendance.filter((c) => c.status === 'in_progress');
  const inProgressProjectsSeminars = enrolledProjectsSeminars.filter((item) => item.status === 'in_progress');
  const completed = enrolledWithAttendance.filter((c) => c.status === 'completed' && !c.isHidden);
  const { active: activeCourses, planning: planningCourses } =
    groupRoadmapCoursesByPlan(inProgress, plans, todayIso);
  const hasActiveItems = activeCourses.length > 0 || inProgressProjectsSeminars.length > 0;
  const hasPlanningItems = planningCourses.length > 0;

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <CourseIntelSyncWindow />

      <section>
        <div className="mb-3 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[#1f1f1f]">
            Active
          </h2>
          <p className="text-sm text-muted-foreground">
            Courses already started and in-progress project work.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeCourses.length > 0 && activeCourses.map(({ course, plan }) =>
          <ActiveCourseTrack
            key={`course-${course.id}`}
            course={course}
            initialProgress={course.progress}
            plan={plan} />

          )}
          {inProgressProjectsSeminars.length > 0 && inProgressProjectsSeminars.map((item) =>
          <ActiveProjectSeminarTrack key={`project-seminar-${item.id}`} item={item} />
          )}
        </div>
        {!hasActiveItems &&
          <p className="text-sm text-muted-foreground mt-4">{dict.dashboard.roadmap.no_active}</p>
        }
      </section>

      <section>
        <div className="mb-3 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[#1f1f1f]">
            Planning
          </h2>
          <p className="text-sm text-muted-foreground">
            In-progress courses without a plan yet or with a start date after today.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {planningCourses.map(({ course, plan }) => (
            <ActiveCourseTrack
              key={`planning-course-${course.id}`}
              course={course}
              initialProgress={course.progress}
              plan={plan}
            />
          ))}
        </div>
        {!hasPlanningItems ? (
          <p className="text-sm text-muted-foreground mt-4">
            No planning items right now.
          </p>
        ) : null}
      </section>

      {enrolledCourses.length === 0 && enrolledProjectsSeminars.length === 0 &&
      <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-7 text-center">
            <Ghost className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-medium text-[#2f2f2f]">{dict.dashboard.roadmap.null_path}</h2>
            <p className="max-w-[420px] text-xs text-muted-foreground">
              {dict.dashboard.roadmap.empty_desc}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/courses">{dict.dashboard.roadmap.empty_cta}</Link>
            </Button>
          </CardContent>
        </Card>
      }
    </div>);

}

function ActiveProjectSeminarTrack({ item }: {item: EnrolledProjectSeminar;}) {
  return (
    <Card className="h-full flex flex-col border-[#efefef] hover:border-[#dfdfdf] transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden bg-white text-[#1f1f1f]">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start gap-3">
          <UniversityIcon
            name={item.university}
            size={38}
            className="shrink-0" />
          
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                {item.courseCode || "P&S"}
              </span>
              <Badge variant="secondary" className="h-4 text-[9px] uppercase px-1.5 font-bold shrink-0">
                {item.category || "Project/Seminar"}
              </Badge>
            </div>
            <CardTitle className="text-base font-bold tracking-tight leading-tight line-clamp-2">
              <Link href={`/projects-seminars/${item.id}`} className="hover:text-black transition-colors">{item.title}</Link>
            </CardTitle>
            <div className="text-[11px] text-muted-foreground font-medium">
              {item.university}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 py-1 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-stone-600">
          <span className="truncate">{item.semesterLabel}</span>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-2 mt-auto border-t border-stone-50 bg-gray-50/20 flex items-center justify-between gap-4">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Status</span>
            <span className="text-[10px] font-bold text-stone-900">In Progress</span>
          </div>
          <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-[#1f1f1f] rounded-full" />
          </div>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-md border-stone-200 hover:bg-white shadow-none bg-white" asChild>
            <Link href={`/projects-seminars/${item.id}`}>
              <ExternalLink className="h-3.5 w-3.5 text-stone-600" />
            </Link>
          </Button>
          {item.url ? (
            <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-md border-stone-200 hover:bg-white shadow-none bg-white" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 text-stone-600" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>);

}
