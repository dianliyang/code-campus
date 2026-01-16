import { Course } from "@/types";
import CourseCard from "@/components/home/CourseCard";
import AchievementCard from "@/components/home/AchievementCard";
import ActiveCourseTrack from "@/components/home/ActiveCourseTrack";
import StudyPlanHeader from "@/components/home/StudyPlanHeader";
import Link from "next/link";
import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

interface EnrolledCourse extends Course {
  status: string;
  progress: number;
  updated_at: string;
  gpa?: number;
  score?: number;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StudyPlanPage({ searchParams }: PageProps) {
  const user = await getUser();
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.profile.user_not_found}</p>
        <Link href="/login" className="mt-8 btn-primary">{dict.dashboard.login.title}</Link>
      </div>
    );
  }

  const userId = user.id;
  const params = await searchParams;
  const focusView = (params.focusView as string) || "track";
  
  const supabase = await createClient();
  const { data: enrolledRows, error } = await supabase
    .from('courses')
    .select(`
      *,
      uc:user_courses!inner(status, progress, updated_at, gpa, score),
      fields:course_fields(fields(name)),
      semesters:course_semesters(semesters(term, year))
    `)
    .eq('user_courses.user_id', userId)
    .order('updated_at', { foreignTable: 'user_courses', ascending: false });

  if (error) {
    console.error("[Supabase] Study plan fetch error:", error);
  }

  const enrolledCourses: EnrolledCourse[] = (enrolledRows || []).map((row: any) => {
    const course = mapCourseFromRow(row);
    const fieldNames = row.fields?.map((f: any) => f.fields.name) || [];
    const semesterNames = row.semesters?.map((s: any) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const uc = row.uc?.[0] || row.user_courses?.[0]; // Supabase join structure can vary based on relation name

    return { 
      ...course, 
      fields: fieldNames, 
      semesters: semesterNames,
      status: uc?.status || 'pending',
      progress: uc?.progress || 0,
      updated_at: uc?.updated_at || new Date().toISOString(),
      gpa: uc?.gpa,
      score: uc?.score,
    } as EnrolledCourse;
  });

  const inProgress = enrolledCourses.filter(c => c.status === 'in_progress');
  const completed = enrolledCourses.filter(c => c.status === 'completed');

  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
          <StudyPlanHeader 
            enrolledCount={enrolledCourses.length} 
            completedCount={completed.length}
            averageProgress={enrolledCourses.length > 0 ? Math.round(enrolledCourses.reduce((acc, curr) => acc + curr.progress, 0) / enrolledCourses.length) : 0}
            dict={dict.dashboard.roadmap}
          />
        </div>

        <div className="relative space-y-32">
          <div className="absolute left-[21px] top-0 bottom-0 w-0.5 bg-gray-100 hidden md:block"></div>

          {/* Current Focus Section */}
          <section className="relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="flex items-center gap-6">
                <div className="w-11 h-11 bg-brand-blue rounded-full flex items-center justify-center text-white z-10 shadow-xl shadow-brand-blue/20 ring-8 ring-white">
                  <i className="fa-solid fa-bolt-lightning text-sm"></i>
                </div>
                <div>
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">{dict.dashboard.roadmap.phase_1_label}</h2>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{dict.dashboard.roadmap.phase_1_title}</h3>
                </div>
              </div>

              {/* View Switcher - Functional Client Component or Link based */}
              <div className="flex bg-gray-50 p-1 rounded-lg gap-1 self-start md:self-auto ml-16 md:ml-0">
                <a 
                  href="?focusView=track" 
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    focusView === 'track' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fa-solid fa-list-ul mr-2"></i> {dict.dashboard.roadmap.view_tracking}
                </a>
                <a 
                  href="?focusView=card" 
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    focusView === 'card' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fa-solid fa-border-all mr-2"></i> {dict.dashboard.roadmap.view_visual}
                </a>
              </div>
            </div>

            <div className={focusView === 'track' ? "grid grid-cols-1 lg:grid-cols-2 gap-6 pl-0 md:pl-20" : "grid grid-cols-1 md:grid-cols-2 gap-8 pl-0 md:pl-20"}>
              {inProgress.length > 0 ? (
                inProgress.map(course => (
                  focusView === 'track' 
                    ? <ActiveCourseTrack key={course.id} course={course} initialProgress={course.progress} dict={dict.dashboard.roadmap} />
                    : <CourseCard key={course.id} course={course} isInitialEnrolled={true} progress={course.progress} dict={dict.dashboard.courses} />
                ))
              ) : (
                <p className="text-sm text-gray-400 font-mono italic">{dict.dashboard.roadmap.no_active}</p>
              )}
            </div>
          </section>

          {/* Achievements Section */}
          <section className="relative">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-11 h-11 bg-brand-green rounded-full flex items-center justify-center text-white z-10 shadow-xl shadow-brand-green/20 ring-8 ring-white">
                <i className="fa-solid fa-trophy text-sm"></i>
              </div>
              <div>
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">{dict.dashboard.roadmap.phase_2_label}</h2>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{dict.dashboard.roadmap.phase_2_title}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pl-0 md:pl-20">
              {completed.length > 0 ? (
                completed.map(course => (
                  <AchievementCard 
                    key={course.id} 
                    course={course} 
                    completionDate={course.updated_at} 
                    masteredLabel={dict.dashboard.roadmap.header_mastered}
                  />
                ))
              ) : (
                <p className="text-sm text-gray-400 font-mono italic">{dict.dashboard.roadmap.peak_ahead}</p>
              )}
            </div>
          </section>
        </div>

        {enrolledCourses.length === 0 && (
          <div className="py-48 text-center relative overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none transition-transform duration-1000 group-hover:scale-110">
              <span className="text-[12rem] font-black uppercase tracking-tighter italic">{dict.dashboard.roadmap.empty_title}</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl border border-gray-100 flex items-center justify-center mb-8 bg-gray-50/50 group-hover:rotate-12 transition-transform duration-500">
                <i className="fa-solid fa-ghost text-gray-200 text-xl"></i>
              </div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.5em] mb-4">{dict.dashboard.roadmap.null_path}</h2>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] max-w-[320px] leading-relaxed mb-12">
                            {dict.dashboard.roadmap.empty_desc}
                          </p>
                          <Link href="/courses" className="btn-primary">
                            {dict.dashboard.roadmap.empty_cta}
                          </Link>
                        </div>          </div>
        )}
      </main>
    </div>
  );
}