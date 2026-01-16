import { queryD1, mapCourseFromRow } from "@/lib/d1";
import { Course } from "@/types";
import CourseCard from "@/components/home/CourseCard";
import AchievementCard from "@/components/home/AchievementCard";
import ActiveCourseTrack from "@/components/home/ActiveCourseTrack";
import StudyPlanHeader from "@/components/home/StudyPlanHeader";
import Link from "next/link";
import { auth } from "@/auth";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

interface EnrolledCourse extends Course {
  status: string;
  progress: number;
  updated_at: string;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StudyPlanPage({ searchParams }: PageProps) {
  const session = await auth();
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  const email = session?.user?.email || "guest@codecampus.example.com";

  const params = await searchParams;
  const focusView = (params.focusView as string) || "track";
  
  const enrolledRows = await queryD1<Record<string, unknown>>(`
    SELECT c.*, uc.status, uc.progress, uc.updated_at,
           GROUP_CONCAT(DISTINCT f.name) as field_names,
           GROUP_CONCAT(DISTINCT s.term || ' ' || s.year) as semester_names
    FROM courses c 
    JOIN user_courses uc ON c.id = uc.course_id 
    LEFT JOIN course_fields cf ON c.id = cf.course_id
    LEFT JOIN fields f ON cf.field_id = f.id
    LEFT JOIN course_semesters cs ON c.id = cs.course_id
    LEFT JOIN semesters s ON cs.semester_id = s.id
    WHERE uc.user_id = (SELECT id FROM users WHERE email = ? LIMIT 1)
    GROUP BY c.id, uc.status, uc.progress, uc.updated_at
    ORDER BY uc.updated_at DESC
  `, [email]);

  const enrolledCourses: EnrolledCourse[] = enrolledRows.map(row => {
    const course = mapCourseFromRow(row);
    const { ...lightCourse } = course;
    const fields = row.field_names ? (row.field_names as string).split(',') : [];
    const semesters = row.semester_names ? (row.semester_names as string).split(',') : [];
    return { 
      ...lightCourse, 
      fields, 
      semesters,
      status: row.status,
      progress: row.progress,
      updated_at: row.updated_at,
      level: row.level as string,
      corequisites: row.corequisites as string
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
          <Link 
            href="/import" 
            className="btn-secondary flex items-center gap-3 mt-4 md:mt-0"
          >
            <i className="fa-solid fa-plus text-[7px]"></i>
            {dict.dashboard.roadmap.import_btn}
          </Link>
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
                  <i className="fa-solid fa-list-ul mr-2"></i> Tracking
                </a>
                <a 
                  href="?focusView=card" 
                  className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    focusView === 'card' ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fa-solid fa-border-all mr-2"></i> Visual
                </a>
              </div>
            </div>

            <div className={focusView === 'track' ? "flex flex-col gap-4 pl-0 md:pl-20" : "grid grid-cols-1 md:grid-cols-2 gap-8 pl-0 md:pl-20"}>
              {inProgress.length > 0 ? (
                inProgress.map(course => (
                  focusView === 'track' 
                    ? <ActiveCourseTrack key={course.id} course={course} initialProgress={course.progress} />
                    : <CourseCard key={course.id} course={course} isInitialEnrolled={true} progress={course.progress} dict={dict.dashboard.courses} />
                ))
              ) : (
                <p className="text-sm text-gray-400 font-mono italic">No active courses. Explore the catalog to begin.</p>
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
                <p className="text-sm text-gray-400 font-mono italic">The peak is still ahead. Keep pushing.</p>
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
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.5em] mb-4">Null Path Detected</h2>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] max-w-[320px] leading-relaxed mb-12">
                            {dict.dashboard.roadmap.empty_desc}
                          </p>
                          <Link href="/courses" className="btn-primary">
                            Begin Initialization
                          </Link>
                        </div>          </div>
        )}
      </main>
    </div>
  );
}