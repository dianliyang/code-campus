import { getUser, createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);

  // Parallelize dictionary loading with initial DB query
  const [dict, { data: enrolledData }] = await Promise.all([
    getDictionary(lang),
    user
      ? supabase.from('user_courses').select('course_id, status, updated_at').eq('user_id', user.id).neq('status', 'hidden')
      : Promise.resolve({ data: null }),
  ]);

  if (!user) return <div className="p-10 text-center">{dict.dashboard.profile.user_not_found}</div>;

  const email = user.email;
  const name = user.user_metadata?.full_name || email?.split('@')[0] || "User";
    
  const enrolledIds = enrolledData?.map(r => r.course_id) || [];
  const statusCounts: Record<string, number> = {};
  enrolledData?.forEach(s => {
    const status = s.status ?? 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // 2. Parallel fetch for Universities and Fields based on enrolled IDs
  let universityCount = 0;
  let allFieldStats: { name: string, count: number }[] = [];

  if (enrolledIds.length > 0) {
    const [uniRes, fieldRes] = await Promise.all([
      supabase.from('courses').select('university').in('id', enrolledIds),
      supabase.from('course_fields').select('fields(name)').in('course_id', enrolledIds)
    ]);

    universityCount = new Set(uniRes.data?.map(r => r.university)).size;

    const fieldCounts: Record<string, number> = {};
    (fieldRes.data as { fields: { name: string } | null }[] | null)?.forEach((cf) => {
      if (cf.fields?.name) {
        fieldCounts[cf.fields.name] = (fieldCounts[cf.fields.name] || 0) + 1;
      }
    });
    
    allFieldStats = Object.entries(fieldCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  const totalCourses = enrolledData?.length || 0;
  const completedCount = statusCounts['completed'] || 0;
  const topField = allFieldStats[0]?.name || dict.dashboard.profile.none;
  const lastActiveData = enrolledData?.sort((a, b) =>
    new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
  )[0];

  const lastActiveDate = lastActiveData?.updated_at ? new Date(lastActiveData.updated_at) : null;

  // Calculate Field Distribution
  const fieldTotal = allFieldStats.reduce((acc, curr) => acc + curr.count, 0);
  const fieldColors = ["bg-brand-blue", "bg-brand-green", "bg-orange-400", "bg-purple-500", "bg-pink-500"];


  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        {/* Profile Header - Tech Console Style */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 md:gap-10 pb-16 md:pb-20 border-b border-gray-100 relative">
          <div className="relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center text-white text-4xl md:text-5xl font-black relative z-10 overflow-hidden">
              {name.substring(0, 1).toUpperCase()}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/40 to-transparent opacity-50"></div>
            </div>
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-blue to-brand-green rounded-[2.1rem] md:rounded-[2.6rem] blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
          </div>

          <div className="flex-grow space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">{name}</h1>
              <div className="flex gap-2">
                <Badge>
                  LVL_{Math.floor(completedCount / 2) + 1}
                </Badge>
                <Badge variant="secondary">
                  {dict.dashboard.profile.user_level.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 md:gap-x-8 gap-y-2 md:gap-y-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-xs font-medium text-slate-400">Email</span>
                <span className="text-xs md:text-sm font-bold text-gray-500 tracking-tight">{email}</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-xs font-medium text-slate-400">Last active</span>
                <span className="text-xs md:text-sm font-bold text-gray-500 tracking-tight">
                  {lastActiveDate ? lastActiveDate.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' }) : "NULL"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-xs font-medium text-slate-400">Universities</span>
                <span className="text-xs md:text-sm font-bold text-gray-500 tracking-tight">{universityCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - High Contrast */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100 border-b border-gray-100">
          <div className="bg-white py-8 md:py-12 pr-4 md:pr-8 flex flex-col">
            <span className="text-xs font-medium text-slate-400 mb-4 md:mb-6">Courses Enrolled</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight leading-none">{totalCourses}</span>
              <span className="text-xs text-slate-400">{dict.dashboard.profile.stat_depth_unit}</span>
            </div>
          </div>

          <div className="bg-white py-8 md:py-12 px-4 md:px-8 flex flex-col border-l border-gray-50">
            <span className="text-xs font-medium text-slate-400 mb-4 md:mb-6">Completed</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-6xl font-bold text-brand-green tracking-tight leading-none">{completedCount}</span>
              <span className="text-xs text-slate-400">{dict.dashboard.profile.stat_mastery_unit}</span>
            </div>
          </div>

          <div className="bg-white py-8 md:py-12 px-4 md:px-8 flex flex-col border-l border-gray-50">
            <span className="text-xs font-medium text-slate-400 mb-4 md:mb-6">Top Field</span>
            <div className="flex flex-col">
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 tracking-tight leading-none truncate mb-1 md:mb-2">
                {topField}
              </h3>
            </div>
          </div>

          <div className="bg-white py-8 md:py-12 pl-4 md:pl-8 flex flex-col border-l border-gray-50">
            <span className="text-xs font-medium text-slate-400 mb-4 md:mb-6">Network Coverage</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-6xl font-bold text-brand-blue tracking-tight leading-none">{universityCount > 0 ? Math.round((universityCount / 4) * 100) : 0}</span>
              <span className="text-lg md:text-xl text-brand-blue/30">%</span>
            </div>
          </div>
        </div>

        {/* Cognitive Fingerprint - Refined */}
        <div className="py-24">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="space-y-1">
              <Badge variant="secondary" className="text-brand-blue">{dict.dashboard.profile.neural_map}</Badge>
              <h3 className="text-4xl font-bold text-gray-900 tracking-tight leading-none">{dict.dashboard.profile.fingerprint}</h3>
            </div>
          </div>

          {fieldTotal > 0 ? (
            <div className="space-y-12 md:space-y-24">
              {/* Frequency Pulse Visualization */}
              <div className="relative h-24 md:h-32 flex items-end gap-[1px] md:gap-[2px] w-full overflow-hidden">
                {allFieldStats.map((f, fieldIdx) => {
                  const percentage = (f.count / fieldTotal) * 100;
                  const tickCount = Math.max(Math.floor(percentage * 1.5), 2);
                  const color = fieldColors[fieldIdx % fieldColors.length];

                  return (
                    <div key={f.name} className="flex items-end gap-[1px] md:gap-[2px] h-full transition-opacity hover:opacity-100 opacity-80" style={{ width: `${percentage}%`, minWidth: '8px' }}>
                      {Array.from({ length: tickCount }).map((_, i) => {
                        const idSeed = user.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const seed = (idSeed * 10000) + (fieldIdx * 1000) + i;
                        const pseudoRandom = Math.abs(Math.sin(seed) * 10000) % 1;
                        const randomHeight = 15 + Math.sin(i * 0.4) * 20 + (pseudoRandom * 65);
                        const pseudoOpacity = 0.3 + (Math.abs(Math.cos(seed) * 10000) % 1 * 0.7);

                        return (
                          <div
                            key={i}
                            className={`w-full min-w-[2px] ${color} rounded-none transition-all duration-1000 ease-out`}
                            style={{
                              height: `${randomHeight}%`,
                              opacity: pseudoOpacity
                            }}
                          ></div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Baseline */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 -z-10"></div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-12">
                {allFieldStats.map((f, i) => (
                  <div key={f.name} className="group cursor-default flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 md:mb-4">
                        <div className={`w-2 h-2 md:w-1.5 md:h-1.5 rounded-full ${fieldColors[i % fieldColors.length]}`}></div>
                        <span className="text-xs font-medium text-gray-900 truncate">{f.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight group-hover:text-brand-blue transition-colors leading-none">{f.count}</span>
                        <span className="text-xs font-medium text-slate-400">{dict.dashboard.profile.units}</span>
                      </div>
                    </div>
                    <div className="mt-3 md:mt-6">
                      <div className="h-px w-full bg-gray-100 relative overflow-hidden">
                        <div
                          className={`absolute inset-0 ${fieldColors[i % fieldColors.length]} transition-transform duration-700 origin-left scale-x-0 group-hover:scale-x-100`}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-32 md:h-40 bg-gray-50 rounded-2xl md:rounded-3xl flex items-center justify-center border border-dashed border-gray-200">
              <p className="text-sm text-slate-400">{dict.dashboard.profile.no_data}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
