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
    <div className="py-20 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, idx) => (
            <div key={idx} className="flex flex-col items-start group">
              <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-brand-blue shadow-sm mb-6 group-hover:scale-110 group-hover:border-brand-blue transition-all duration-300">
                <i className={`${feature.icon} text-xl`}></i>
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xs">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
