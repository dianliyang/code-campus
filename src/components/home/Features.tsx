import { Layers, TrendingUp, Cpu, type LucideIcon } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Features({ dict }: { dict: any }) {
  const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
      icon: Layers,
      title: dict.universal_index.title,
      description: dict.universal_index.desc,
    },
    {
      icon: TrendingUp,
      title: dict.progress_analytics.title,
      description: dict.progress_analytics.desc,
    },
    {
      icon: Cpu,
      title: dict.gap_analysis.title,
      description: dict.gap_analysis.desc,
    },
  ];

  return (
    <div id="features" className="py-20 sm:py-32 bg-slate-50 relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {features.map((feature, idx) => (
            <div key={idx} className="group relative transition-all duration-500">
              {/* Minimalist Icon Container */}
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 mb-6 sm:mb-8 transition-all duration-500 group-hover:border-brand-blue/40 group-hover:text-brand-blue group-hover:shadow-md">
                <feature.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mb-3 sm:mb-4 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] transition-colors group-hover:text-slate-600">
                {feature.description}
              </p>

              {/* Subtle Bottom Bar Accent */}
              <div className="mt-6 sm:mt-8 h-px w-8 bg-slate-200 transition-all duration-500 group-hover:w-16 group-hover:bg-brand-blue/50"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
