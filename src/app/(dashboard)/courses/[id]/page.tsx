import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, mapCourseFromRow, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { Course } from "@/types";
import CourseDetailContent from "@/components/courses/CourseDetailContent";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("title, course_code, university")
    .eq("id", Number(id))
    .single();

  if (!data) {
    return { title: "Course Not Found" };
  }

  const title = `${data.course_code}: ${data.title} - ${data.university}`;
  return {
    title,
    openGraph: { title },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const [{ id }, lang] = await Promise.all([params, getLanguage()]);
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-3">
      <Suspense fallback={<CourseDetailSkeleton />}>
        <CourseDetailData id={id} dict={dict.dashboard} />
      </Suspense>
    </div>
  );
}

async function CourseDetailData({ id, dict }: { id: string; dict: Dictionary['dashboard'] }) {
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  // Parallelize course fetch and related data.
  const coursePromise = supabase
    .from("courses")
    .select(
      `
      id, university, course_code, title, units, credit, url, description, details, instructors, prerequisites, related_urls, cross_listed_courses, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
      fields:course_fields(fields(name)),
      semesters:course_semesters(semesters(term, year))
    `
    )
    .eq("id", Number(id))
    .single();

  const enrollmentPromise = user
    ? supabase
        .from("user_courses")
        .select("progress")
        .eq("user_id", user.id)
        .eq("course_id", Number(id))
        .single()
    : Promise.resolve({ data: null });

  const topicsPromise = supabase.from("fields").select("name").order("name", { ascending: true });
  const semestersPromise = supabase
    .from("semesters")
    .select("term, year")
    .order("year", { ascending: false })
    .order("term", { ascending: true });

  const studyPlansPromise = user
    ? supabase
        .from("study_plans")
        .select("id, start_date, end_date, days_of_week, start_time, end_time, location, type")
        .eq("user_id", user.id)
        .eq("course_id", Number(id))
        .order("start_date", { ascending: true })
    : Promise.resolve({ data: [] });

  const [
    { data, error },
    { data: enrollment },
    { data: topicRows },
    { data: semesterRows },
    { data: studyPlanRows },
  ] = await Promise.all([
    coursePromise,
    enrollmentPromise,
    topicsPromise,
    semestersPromise,
    studyPlansPromise,
  ]);

  if (error || !data) {
    notFound();
  }

  const { data: relatedProjectSeminar } = await supabase
    .from("projects_seminars")
    .select("id, category")
    .eq("university", String(data.university))
    .eq("course_code", String(data.course_code))
    .maybeSingle();

  const row = data as Record<string, unknown>;
  const course = mapCourseFromRow(row);
  const fieldNames = (row.fields as { fields: { name: string } }[] | null)?.map((f) => f.fields.name) || [];
  const semesterNames =
    (row.semesters as { semesters: { term: string; year: number } }[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) ||
    [];

  const fullCourse = {
    ...course,
    fields: fieldNames,
    semesters: semesterNames,
  } as Course;

  const isEnrolled = !!enrollment;
  const topicNamesAll = (topicRows || []).map((r) => r.name);
  const semesterNamesAll = (semesterRows || []).map((r) => `${r.term} ${r.year}`);
  const editableStudyPlans = (studyPlanRows || []).map((p) => ({
    id: p.id,
    startDate: p.start_date,
    endDate: p.end_date,
    daysOfWeek: p.days_of_week || [],
    startTime: p.start_time || "09:00:00",
    endTime: p.end_time || "10:00:00",
    location: p.location || "",
    type: p.type || "",
  }));

  return (
    <CourseDetailContent
      course={fullCourse}
      isEnrolled={isEnrolled}
      descriptionEmptyText={dict.course_detail.description_empty}
      availableTopics={topicNamesAll}
      availableSemesters={semesterNamesAll}
      studyPlans={editableStudyPlans}
      projectSeminarRef={
        relatedProjectSeminar?.id
          ? { id: relatedProjectSeminar.id, category: relatedProjectSeminar.category || "Project/Seminar" }
          : null
      }
    />
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl"></div>
        <div className="space-y-2 flex-grow">
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          <div className="h-8 bg-gray-100 rounded w-2/3"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <div className="h-40 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg"></div>
          <div className="h-60 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg"></div>
        </div>
        <div className="lg:col-span-4 h-80 bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg"></div>
      </div>
    </div>
  );
}
