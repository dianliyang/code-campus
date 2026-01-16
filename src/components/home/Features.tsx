// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Features({ dict }: { dict: any }) {
  const features = [
    {
      icon: "fa-solid fa-layer-group",
      title: dict.universal_index.title,
      description: dict.universal_index.desc,
    },
    {
      icon: "fa-solid fa-chart-line",
      title: dict.progress_analytics.title,
      description: dict.progress_analytics.desc,
    },
    {
      icon: "fa-solid fa-microchip",
      title: dict.gap_analysis.title,
      description: dict.gap_analysis.desc,
    },
  ];

  return (
    <div id="features" className="py-32 bg-[#050505] relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, idx) => (
            <div key={idx} className="group relative transition-all duration-500">
              {/* Minimalist Icon Container */}
              <div className="w-12 h-12 rounded-lg bg-gray-900 border border-white/10 flex items-center justify-center text-slate-400 mb-8 transition-all duration-500 group-hover:border-brand-blue/40 group-hover:text-white">
                <i className={`${feature.icon} text-lg`}></i>
              </div>
              
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] transition-colors group-hover:text-slate-400">
                {feature.description}
              </p>

              {/* Subtle Bottom Bar Accent */}
              <div className="mt-8 h-px w-8 bg-white/10 transition-all duration-500 group-hover:w-16 group-hover:bg-brand-blue/50"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
