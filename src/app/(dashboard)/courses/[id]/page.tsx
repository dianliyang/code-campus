import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient, mapCourseFromRow, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { Course } from "@/types";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import { ArrowLeft, Clock, Users, ExternalLink, Globe, Info } from "lucide-react";

import FormattedDescription from "@/components/courses/FormattedDescription";

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
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
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
  const [supabase, user] = await Promise.all([createClient(), getUser()]);

  // Parallelize course fetch and enrollment check
  const coursePromise = supabase
    .from("courses")
    .select(
      `
      id, university, course_code, title, units, url, description, details, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal,
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

  const [{ data, error }, { data: enrollment }] = await Promise.all([
    coursePromise,
    enrollmentPromise,
  ]);

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

  const isEnrolled = !!enrollment;

  return (
    <div className="space-y-16 pb-20">
      <CourseDetailHeader course={fullCourse} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        
        {/* MAIN CONTENT (Left Column) */}
        <div className="lg:col-span-8 space-y-16">
          
          {/* Description */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6">About this Course</h2>
            <div className="prose prose-lg prose-gray max-w-none prose-p:text-gray-600 prose-p:leading-8">
              {fullCourse.description ? (
                <FormattedDescription text={fullCourse.description} />
              ) : (
                <p className="text-gray-500 italic">
                  {dict.course_detail.description_empty}
                </p>
              )}
            </div>
          </section>

          {/* Schedule & Staff */}
          {(fullCourse.details?.schedule || fullCourse.details?.instructors) && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">Logistics</h2>
              <div className="grid sm:grid-cols-2 gap-12">
                
                {fullCourse.details?.schedule && Object.keys(fullCourse.details.schedule).length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Weekly Schedule
                    </h3>
                    <div className="space-y-6">
                      {Object.entries(fullCourse.details.schedule).map(([type, times]) => (
                        <div key={type}>
                          <div className="text-xs font-bold text-gray-400 mb-1">{type}</div>
                          <ul className="space-y-2">
                            {(times as string[]).map((time, idx) => (
                              <li key={idx} className="text-sm text-gray-700 leading-snug break-all">
                                {time}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fullCourse.details?.instructors && fullCourse.details.instructors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      Teaching Staff
                    </h3>
                    <ul className="space-y-3">
                      {(fullCourse.details.instructors as string[]).map((inst, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold font-mono">
                            {inst.charAt(0)}
                          </div>
                          <span className="text-base font-medium text-gray-900">{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Requirements */}
          {(fullCourse.details?.prerequisites || fullCourse.corequisites) && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Prerequisites</h2>
              <div className="space-y-8">
                {fullCourse.details?.prerequisites && (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Required Knowledge</span>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {fullCourse.details.prerequisites}
                    </p>
                  </div>
                )}
                {fullCourse.corequisites && (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Corequisites</span>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {fullCourse.corequisites}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <aside className="lg:col-span-4 space-y-10">
          <div className="sticky top-32 space-y-10">
            
            {/* Primary Action */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Your Status</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isEnrolled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
              <a
                href={fullCourse.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl transition-colors group"
              >
                <span className="text-sm">Visit Course Page</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </a>
            </div>

            <hr className="border-gray-100" />

            {/* Course Facts */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6">Course Facts</h3>
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500">Credits</dt>
                  <dd className="font-bold text-gray-900">{fullCourse.credit ? `${fullCourse.credit} ECTS` : '-'}</dd>
                </div>
                <div className="flex justify-between py-1 overflow-visible relative">
                  <dt className="text-gray-500 flex-shrink-0 flex items-center gap-1.5 group cursor-help">
                    Units (L-D-E)
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                    
                    {/* Tooltip */}
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-56 p-4 bg-white text-gray-900 text-xs rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-left">
                      <p className="font-bold mb-2 text-gray-400 uppercase tracking-widest text-[10px]">Weekly Structure</p>
                      <p className="mb-3 text-gray-600 font-medium">Lecture - Recitation - Lab</p>
                      <div className="space-y-1.5 text-gray-500 font-medium">
                        <div className="flex justify-between border-b border-gray-50 pb-1"><span>Lecture</span><span className="font-mono text-gray-900">X-0-0</span></div>
                        <div className="flex justify-between border-b border-gray-50 pb-1"><span>Recitation</span><span className="font-mono text-gray-900">0-Y-0</span></div>
                        <div className="flex justify-between border-b border-gray-50 pb-1"><span>Lab/Project</span><span className="font-mono text-gray-900">0-0-Z</span></div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 rotate-45 w-3 h-3 bg-white border-r border-t border-gray-100"></div>
                    </div>
                  </dt>
                  <dd className="font-bold text-gray-900 text-right pl-4 break-words">{fullCourse.units || '-'}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500 flex-shrink-0">Workload</dt>
                  <dd className="font-bold text-gray-900 text-right pl-4 break-words">{fullCourse.units || '-'}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500 flex-shrink-0">Level</dt>
                  <dd className="font-bold text-gray-900 capitalize text-right pl-4 break-words">{fullCourse.level || '-'}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-500 flex-shrink-0">Department</dt>
                  <dd className="font-bold text-gray-900 text-right pl-4 break-words">
                    {fullCourse.department || '-'}
                  </dd>
                </div>
                <div className="flex flex-col py-1 gap-2">
                  <dt className="text-gray-500">Available Terms</dt>
                  <dd className="font-bold text-gray-900 flex flex-wrap gap-1.5 justify-end">
                    {fullCourse.semesters.length > 0 ? (
                      fullCourse.semesters.map((s, idx) => (
                        <span key={idx} className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-[11px] whitespace-nowrap">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 font-normal italic">Historical</span>
                    )}
                  </dd>
                </div>
                {fullCourse.details?.internalId && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">ID</dt>
                    <dd className="font-mono text-gray-400">{fullCourse.details.internalId}</dd>
                  </div>
                )}
              </dl>
            </div>

            <hr className="border-gray-100" />

            {/* Relations */}
            {(fullCourse.details?.crossListedCourses || (fullCourse.details?.relatedUrls && fullCourse.details.relatedUrls.length > 0)) && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6">Resources</h3>
                <div className="space-y-6">
                  {fullCourse.details?.relatedUrls && fullCourse.details.relatedUrls.length > 0 && (
                    <ul className="space-y-3">
                      {fullCourse.details.relatedUrls.map((url: string, i: number) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-blue hover:text-brand-dark hover:underline flex items-start gap-2 break-all">
                            <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {fullCourse.details?.crossListedCourses && (
                    <div>
                      <span className="text-xs font-bold text-gray-400 block mb-2">Cross-Listed</span>
                      <p className="text-sm text-gray-600 leading-relaxed">{fullCourse.details.crossListedCourses}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-12 max-w-7xl mx-auto pt-32 px-4">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
        <div className="space-y-2 flex-grow">
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
          <div className="h-12 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        <div className="lg:col-span-8 space-y-8">
          <div className="h-40 bg-gray-50 rounded-2xl"></div>
          <div className="h-60 bg-gray-50 rounded-2xl"></div>
        </div>
        <div className="lg:col-span-4 h-80 bg-gray-50 rounded-3xl"></div>
      </div>
    </div>
  );
}