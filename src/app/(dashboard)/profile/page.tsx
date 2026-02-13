import SecurityIdentitySection from "@/components/profile/SecurityIdentitySection";
import { getUser, createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LogoutButton from "@/components/layout/LogoutButton";
import Link from "next/link";
import { Clock, GraduationCap, Settings } from "lucide-react";

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

  if (!user) return <div className="p-10 text-center font-mono">{dict.dashboard.profile.user_not_found}</div>;

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
                <Clock className="w-4 h-4 text-brand-blue" />
                {dict.dashboard.profile.last_active} {lastActiveDate ? lastActiveDate.toLocaleDateString(lang, { month: 'short', day: 'numeric' }) : dict.dashboard.profile.never}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <GraduationCap className="w-4 h-4 text-brand-green" />
                {universityCount} {dict.dashboard.profile.institutions}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/settings" className="flex items-center gap-2 btn-secondary px-6 py-2.5">
              <Settings className="w-3 h-3" />
              <span>{dict.dashboard.profile.settings}</span>
            </Link>
            <LogoutButton showLabel={true} dict={dict} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-16 py-10 md:py-16 border-b border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-4">{dict.dashboard.profile.stat_depth}</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none">{totalCourses}</span>
              <span className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-wider md:tracking-widest">{dict.dashboard.profile.stat_depth_unit}</span>
            </div>
            <p className="hidden md:block text-sm text-gray-600 font-medium mt-6 leading-relaxed max-w-[240px]">{dict.dashboard.profile.stat_depth_desc}</p>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-4">{dict.dashboard.profile.stat_mastery}</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-7xl font-black text-brand-green tracking-tighter leading-none">{completedCount}</span>
              <span className="text-[10px] md:text-sm font-bold text-green-600 uppercase tracking-wider md:tracking-widest">{dict.dashboard.profile.stat_mastery_unit}</span>
            </div>
            <p className="hidden md:block text-sm text-gray-600 font-medium mt-6 leading-relaxed max-w-[240px]">{dict.dashboard.profile.stat_mastery_desc}</p>
          </div>

          <div className="flex flex-col md:border-l md:border-gray-100 md:pl-12">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-4">{dict.dashboard.profile.stat_focus}</span>
            <div className="flex flex-col justify-center">
              <h3 className="text-base md:text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase truncate">
                {topField}
              </h3>
              <p className="hidden md:block text-sm text-gray-600 font-medium mt-4 leading-relaxed">{dict.dashboard.profile.stat_focus_desc}</p>
            </div>
          </div>

          <div className="flex flex-col md:border-l md:border-gray-100 md:pl-12">
            <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mb-2 md:mb-4">{dict.dashboard.profile.stat_diversity}</span>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-4xl md:text-7xl font-black text-brand-blue tracking-tighter leading-none">{universityCount > 0 ? Math.round((universityCount / 4) * 100) : 0}</span>
              <span className="text-[10px] md:text-sm font-bold text-blue-600 uppercase tracking-wider md:tracking-widest">%</span>
            </div>
            <p className="hidden md:block text-sm text-gray-600 font-medium mt-6 leading-relaxed">{dict.dashboard.profile.stat_diversity_desc}</p>
          </div>
        </div>

        {/* Cognitive Fingerprint Visualization */}
        <div className="py-12 md:py-24 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10 md:mb-20">
            <div>
              <h2 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-[0.3em] md:tracking-[0.4em] mb-2">{dict.dashboard.profile.neural_map}</h2>
              <h3 className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">{dict.dashboard.profile.fingerprint}</h3>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-[0.15em] md:tracking-[0.2em] border border-gray-100 px-2 md:px-3 py-1 rounded-lg">DATA_SIG: 0x{user.id.substring(0, 8).toUpperCase()}</span>
            </div>
          </div>

          {fieldTotal > 0 ? (
            <div className="space-y-12 md:space-y-24">
              {/* Frequency Pulse Visualization */}
              <div className="relative h-24 md:h-32 flex items-end gap-[1px] md:gap-[2px] w-full overflow-hidden rounded-lg">
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
                            className={`w-full min-w-[2px] ${color} rounded-t-sm md:rounded-t-full transition-all duration-1000 ease-out`}
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
                        <span className="text-[9px] md:text-[10px] font-black text-gray-900 uppercase tracking-wider md:tracking-widest truncate">{f.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter group-hover:text-brand-blue transition-colors leading-none">{f.count}</span>
                        <span className="text-[8px] md:text-[10px] font-bold text-gray-300 uppercase tracking-wider md:tracking-widest">{dict.dashboard.profile.units}</span>
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
              <p className="text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-[0.2em] md:tracking-[0.3em]">{dict.dashboard.profile.no_data}</p>
            </div>
          )}
        </div>

        <SecurityIdentitySection dict={dict.dashboard.profile} />
      </main>
    </div>
  );
}
