import DeleteAccount from "@/components/profile/DeleteAccount";
import { getUser, createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LogoutButton from "@/components/layout/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  
  if (!user) return <div className="p-10 text-center font-mono">{dict.dashboard.profile.user_not_found}</div>;

  const email = user.email;
  const name = user.user_metadata?.full_name || email?.split('@')[0] || "User";
  const supabase = await createClient();

  // Enriched Queries - using Supabase client
  const { data: statsData } = await supabase
    .from('user_courses')
    .select('status')
    .eq('user_id', user.id);
    
  const statusCounts: Record<string, number> = {};
  statsData?.forEach(s => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  const { data: uniData } = await supabase
    .from('courses')
    .select('university', { count: 'exact', head: false })
    .in('id', (await supabase.from('user_courses').select('course_id').eq('user_id', user.id)).data?.map(r => r.course_id) || []);
    
  const universityCount = new Set(uniData?.map(r => r.university)).size;

  const { data: fieldStats } = await supabase
    .from('fields')
    .select('name, course_fields!inner(course_id, user_courses!inner(user_id))')
    .eq('course_fields.user_courses.user_id', user.id);
    
  const fieldCounts: Record<string, number> = {};
  fieldStats?.forEach((f: any) => {
    fieldCounts[f.name] = (fieldCounts[f.name] || 0) + 1;
  });
  
  const allFieldStats = Object.entries(fieldCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const { data: lastActiveData } = await supabase
    .from('user_courses')
    .select('updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1);

  const totalCourses = statsData?.length || 0;
  const completedCount = statusCounts['completed'] || 0;
  const topField = allFieldStats[0]?.name || dict.dashboard.profile.none;
  const lastActiveDate = lastActiveData?.[0]?.updated_at ? new Date(lastActiveData[0].updated_at) : null;

  // Calculate Field Distribution
  const fieldTotal = allFieldStats.reduce((acc, curr) => acc + curr.count, 0);
  const fieldColors = ["bg-brand-blue", "bg-brand-green", "bg-orange-400", "bg-purple-500", "bg-pink-500"];


  return (
    <div className="flex flex-col min-h-screen bg-white">
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-8 pb-16 border-b border-gray-100">
          <div className="w-32 h-32 bg-brand-dark rounded-full flex items-center justify-center text-white text-5xl font-black ring-8 ring-gray-50">
            {name.substring(0, 1).toUpperCase()}
          </div>
          <div className="flex-grow space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{name}</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gray-200">
                {dict.dashboard.profile.level_short} {Math.floor(completedCount / 2) + 1} {dict.dashboard.profile.user_level}
              </span>
            </div>
            <p className="text-xl text-gray-400 font-medium tracking-tight">{email}</p>
            <div className="flex items-center gap-6 mt-4 pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <i className="fa-regular fa-clock text-brand-blue"></i>
                {dict.dashboard.profile.last_active} {lastActiveDate ? lastActiveDate.toLocaleDateString(lang, { month: 'short', day: 'numeric' }) : dict.dashboard.profile.never}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <i className="fa-solid fa-graduation-cap text-brand-green"></i>
                {universityCount} {dict.dashboard.profile.institutions}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button className="flex items-center gap-2 btn-secondary px-6 py-2.5">
              <i className="fa-solid fa-gear text-[10px]"></i>
              <span>{dict.dashboard.profile.settings}</span>
            </button>
            <LogoutButton showLabel={true} dict={dict} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 py-16 border-b border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">{dict.dashboard.profile.stat_depth}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-gray-900 tracking-tighter leading-none">{totalCourses}</span>
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{dict.dashboard.profile.stat_depth_unit}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium mt-6 leading-relaxed max-w-[240px]">{dict.dashboard.profile.stat_depth_desc}</p>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">{dict.dashboard.profile.stat_mastery}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-brand-green tracking-tighter leading-none">{completedCount}</span>
              <span className="text-sm font-bold text-green-600 uppercase tracking-widest">{dict.dashboard.profile.stat_mastery_unit}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium mt-6 leading-relaxed max-w-[240px]">{dict.dashboard.profile.stat_mastery_desc}</p>
          </div>

          <div className="flex flex-col border-l border-gray-100 pl-12 hidden md:flex">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">{dict.dashboard.profile.stat_focus}</span>
            <div className="h-full flex flex-col justify-center">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                {topField}
              </h3>
              <p className="text-sm text-gray-600 font-medium mt-4 leading-relaxed">{dict.dashboard.profile.stat_focus_desc}</p>
            </div>
          </div>

          <div className="flex flex-col border-l border-gray-100 pl-12 hidden md:flex">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">{dict.dashboard.profile.stat_diversity}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black text-brand-blue tracking-tighter leading-none">{universityCount > 0 ? Math.round((universityCount / 4) * 100) : 0}</span>
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">%</span>
            </div>
            <p className="text-sm text-gray-600 font-medium mt-6 leading-relaxed">{dict.dashboard.profile.stat_diversity_desc}</p>
          </div>
        </div>

        {/* Cognitive Fingerprint Visualization */}
        <div className="py-24 border-b border-gray-100">
          <div className="flex justify-between items-end mb-20">
            <div>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-2">{dict.dashboard.profile.neural_map}</h2>
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">{dict.dashboard.profile.fingerprint}</h3>
            </div>
            <div className="text-right hidden md:block">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border border-gray-100 px-3 py-1 rounded-lg">DATA_SIG: 0x{user.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>


          {fieldTotal > 0 ? (
            <div className="space-y-24">
              {/* Innovative Frequency Pulse - Deterministic Seeded Generation */}
              <div className="relative h-32 flex items-end gap-[2px] w-full">
                {allFieldStats.map((f, fieldIdx) => {
                  const percentage = (f.count / fieldTotal) * 100;
                  const tickCount = Math.max(Math.floor(percentage * 2.5), 2);
                  const color = fieldColors[fieldIdx % fieldColors.length];
                  
                  return (
                    <div key={f.name} className="flex items-end gap-[2px] h-full transition-opacity hover:opacity-100 opacity-80" style={{ width: `${percentage}%` }}>
                      {Array.from({ length: tickCount }).map((_, i) => {
                        // Deterministic height based on user ID, field, and tick index
                        // Using char codes of UUID for deterministic seed
                        const idSeed = user.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                        const seed = (idSeed * 10000) + (fieldIdx * 1000) + i;
                        const pseudoRandom = Math.abs(Math.sin(seed) * 10000) % 1;
                        const randomHeight = 15 + Math.sin(i * 0.4) * 20 + (pseudoRandom * 65);
                        const pseudoOpacity = 0.2 + (Math.abs(Math.cos(seed) * 10000) % 1 * 0.8);
                        
                        return (
                          <div 
                            key={i} 
                            className={`w-full ${color} rounded-t-full transition-all duration-1000 ease-out`}
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
                
                {/* Precise Horizontal Baseline */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 -z-10"></div>
              </div>

              {/* Legend Matrix - Perfect Alignment */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-12">
                {allFieldStats.map((f, i) => (
                  <div key={f.name} className="group cursor-default flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-1.5 h-1.5 rounded-full ${fieldColors[i % fieldColors.length]}`}></div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest truncate">{f.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-gray-900 tracking-tighter group-hover:text-brand-blue transition-colors leading-none">{f.count}</span>
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{dict.dashboard.profile.units}</span>
                      </div>
                    </div>
                    <div className="mt-6">
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
            <div className="h-40 bg-gray-50 rounded-3xl flex items-center justify-center border border-dashed border-gray-200">
              <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">{dict.dashboard.profile.no_data}</p>
            </div>
          )}
        </div>

        {/* Identity Section */}
        <div className="pt-16">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-12">{dict.dashboard.profile.security_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-12">
              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-2xl">
                  <i className="fa-brands fa-github"></i>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{dict.dashboard.profile.github_title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.dashboard.profile.github_desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-brand-green uppercase tracking-widest bg-green-50 w-fit px-3 py-1 rounded-lg border border-green-100">
                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full"></span>
                    {dict.dashboard.profile.connected}
                  </div>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{dict.dashboard.profile.google_title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.dashboard.profile.google_desc}</p>
                  <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-brand-blue uppercase tracking-widest bg-blue-50/50 w-fit px-3 py-1 rounded-lg border border-blue-100/50 hover:bg-blue-50 cursor-pointer">
                    {dict.dashboard.profile.link_account}
                  </button>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center text-2xl">
                  <i className="fa-brands fa-apple"></i>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{dict.dashboard.profile.apple_title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.dashboard.profile.apple_desc}</p>
                  <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 w-fit px-3 py-1 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-pointer">
                    {dict.dashboard.profile.link_account}
                  </button>
                </div>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6" viewBox="0 0 23 23">
                    <rect width="10.5" height="10.5" fill="#f25022"/>
                    <rect width="10.5" height="10.5" x="11.5" fill="#7fbb00"/>
                    <rect width="10.5" height="10.5" y="11.5" fill="#00a4ef"/>
                    <rect width="10.5" height="10.5" x="11.5" y="11.5" fill="#ffb900"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{dict.dashboard.profile.microsoft_title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1">{dict.dashboard.profile.microsoft_desc}</p>
                  <button className="mt-4 flex items-center gap-2 text-[10px] font-black text-[#00a1f1] uppercase tracking-widest bg-blue-50/30 w-fit px-3 py-1 rounded-lg border border-blue-100/30 hover:bg-blue-50 cursor-pointer">
                    {dict.dashboard.profile.link_account}
                  </button>
                </div>
              </div>
            </div>

            <DeleteAccount dict={dict.dashboard.profile} />
          </div>
        </div>
      </main>
    </div>
  );
}