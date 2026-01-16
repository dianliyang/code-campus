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
    <div id="features" className="py-32 bg-[#050505] relative overflow-hidden">
      {/* Dot Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-brand-blue/30 transition-all duration-500 hover:-translate-y-1">
              
              {/* Icon Container with Neon Glow */}
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-brand-blue shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-8 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] group-hover:border-brand-blue/50 transition-all duration-500">
                <i className={`${feature.icon} text-xl group-hover:scale-110 transition-transform duration-300`}></i>
              </div>
              
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 group-hover:text-brand-blue transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative Corner Accent */}
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white/5 group-hover:bg-brand-blue transition-colors duration-500"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
