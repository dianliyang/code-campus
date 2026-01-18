import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient, mapCourseFromRow, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { Course } from "@/types";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.3em] hover:text-brand-blue transition-colors mb-12 group"
        >
          <i className="fa-solid fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
          {dict.dashboard.course_detail.back_to_catalog}
        </Link>

        <Suspense fallback={<CourseDetailSkeleton />}>
          <CourseDetailData id={id} dict={dict.dashboard} />
        </Suspense>
      </div>
    </div>
  );
}

async function CourseDetailData({ id, dict }: { id: string; dict: Dictionary['dashboard'] }) {
  const supabase = await createClient();
  const user = await getUser();

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
      *,
      fields:course_fields(fields(name)),
      semesters:course_semesters(semesters(term, year))
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

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

  let isEnrolled = false;
  let progress = 0;

  if (user) {
    const { data: enrollment } = await supabase
      .from("user_courses")
      .select("progress")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .single();

    if (enrollment) {
      isEnrolled = true;
      progress = enrollment.progress || 0;
    }
  }

  return (
    <div className="space-y-12">
      <CourseDetailHeader course={fullCourse} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 border-t border-gray-100 pt-12">
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-6">
              {dict.course_detail.description_title}
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-lg text-gray-600 leading-relaxed font-medium">
                {fullCourse.description ||
                  dict.course_detail.description_empty}
              </p>
            </div>
          </section>

          {fullCourse.corequisites && (
            <section className="bg-brand-blue/[0.02] border border-brand-blue/10 rounded-2xl p-8">
              <h3 className="text-xs font-black text-brand-blue uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <i className="fa-solid fa-link"></i>
                {dict.course_detail.corequisites_title}
              </h3>
              <p className="text-sm text-gray-700 font-bold leading-relaxed italic">
                {fullCourse.corequisites}
              </p>
            </section>
          )}

          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-6">
              {dict.course_detail.syllabus_title}
            </h2>
            <div className="grid grid-cols-2 gap-8">
              {fullCourse.department && (
                <div>
                  <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                    {dict.course_detail.department}
                  </span>
                  <span className="text-sm font-bold text-gray-900 uppercase">
                    {fullCourse.department}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                  {dict.course_detail.level}
                </span>
                <span className="text-sm font-bold text-gray-900 uppercase">
                  {fullCourse.level || dict.course_detail.level_unspecified}
                </span>
              </div>
              {fullCourse.units && (
                <div>
                  <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                    {dict.course_detail.units}
                  </span>
                  <span className="text-sm font-bold text-gray-900 uppercase">
                    {fullCourse.units}
                  </span>
                </div>
              )}
              <div>
                <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                  {dict.course_detail.workload}
                </span>
                <span className="text-sm font-bold text-gray-900 uppercase">
                  {fullCourse.workload || dict.course_detail.workload_standard}
                </span>
              </div>
              {typeof fullCourse.difficulty === 'number' && fullCourse.difficulty > 0 && (
                <div>
                  <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                    {dict.course_detail.difficulty}
                  </span>
                  <span className="text-sm font-bold text-gray-900 uppercase">
                    {fullCourse.difficulty.toFixed(1)} / 5.0
                  </span>
                </div>
              )}
              <div>
                <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                  {dict.course_detail.availability}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {fullCourse.semesters.map((s) => (
                    <span
                      key={s}
                      className="text-xs font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                  {fullCourse.semesters.length === 0 && (
                    <span className="text-xs font-bold text-gray-400 italic">
                      {dict.course_detail.historical}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                  {dict.course_detail.global_index}
                </span>
                <span className="text-sm font-bold text-gray-900 uppercase">
                  #{fullCourse.id}
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <div className="bg-white border-2 border-gray-900 rounded-3xl p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue mb-6">
              <i className="fa-solid fa-bolt-lightning text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-2">
              {dict.course_detail.enrollment_status}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">
              {isEnrolled ? dict.course_detail.status_enrolled : dict.course_detail.status_ready}
            </p>

            <a
              href={fullCourse.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative w-full flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-brand-dark px-6 py-4 text-sm font-bold tracking-wide text-white shadow-xl shadow-brand-dark/20 transition-all duration-300 hover:bg-gray-800 hover:shadow-brand-dark/40 hover:-translate-y-1 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                {dict.course_detail.go_to_page}
                <i className="fa-solid fa-arrow-up-right-from-square text-xs transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"></i>
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
            </a>

            {isEnrolled && (
              <div className="w-full mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {dict.course_detail.progress}
                  </span>
                  <span className="text-sm font-black text-brand-blue italic">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-blue transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border border-gray-100 rounded-3xl">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">
              {dict.course_detail.impact_stats}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-grow">
                <div className="text-2xl font-black text-gray-900 italic leading-none">
                  {fullCourse.popularity}
                </div>
                <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">
                  {dict.course_detail.global_interest}
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                <i className="fa-solid fa-fire-flame-simple"></i>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-12">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
        <div className="space-y-2 flex-grow">
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          <div className="h-12 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="h-40 bg-gray-50 rounded-2xl"></div>
          <div className="h-60 bg-gray-50 rounded-2xl"></div>
        </div>
        <div className="h-80 bg-gray-50 rounded-3xl"></div>
      </div>
    </div>
  );
}
