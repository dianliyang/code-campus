import { Badge } from "@/components/ui/badge";

const universities = ["MIT", "Stanford", "UC Berkeley", "CMU"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Mission({ dict }: { dict: any }) {
  return (
    <section id="mission" className="py-24 sm:py-32 bg-white relative overflow-hidden border-t border-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-blue/5 via-white to-white pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative z-10">
            <Badge variant="outline" className="mb-6 sm:mb-8 text-brand-blue border-brand-blue/20 bg-brand-blue/5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse mr-2 inline-block" />
              {dict.label}
            </Badge>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 sm:mb-8 leading-tight text-slate-900">
              {dict.title_prefix} <br /> {dict.title_middle}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-600">
                {dict.title_highlight}
              </span>
              .
            </h2>

            <div className="space-y-4 sm:space-y-6 text-slate-500 font-medium text-base sm:text-lg leading-relaxed max-w-xl">
              <p>{dict.desc_1}</p>
              <p>{dict.desc_2}</p>
            </div>

            <div className="mt-10 sm:mt-12 flex flex-wrap gap-8 sm:gap-12 border-t border-slate-100 pt-10 sm:pt-12">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">4+</div>
                <div className="text-xs text-slate-400 font-medium">{dict.stat_sources}</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">2.4k</div>
                <div className="text-xs text-slate-400 font-medium">{dict.stat_nodes}</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 mb-1">100%</div>
                <div className="text-xs text-slate-400 font-medium">Free</div>
              </div>
            </div>
          </div>

          {/* University badges grid */}
          <div className="relative">
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
              <p className="text-sm text-slate-400 font-medium mb-6">Featured universities</p>
              <div className="flex flex-wrap gap-3">
                {universities.map((uni) => (
                  <Badge
                    key={uni}
                    variant="secondary"
                    className="px-4 py-2 text-sm font-medium"
                  >
                    {uni}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
