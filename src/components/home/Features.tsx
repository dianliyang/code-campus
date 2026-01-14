export default function Features() {
  const features = [
    {
      icon: "fa-solid fa-layer-group",
      title: "Universal Index",
      description: "Query a normalized database of curricula from MIT, Stanford, Berkeley, and CMU in one unified interface.",
    },
    {
      icon: "fa-solid fa-chart-line",
      title: "Progress Analytics",
      description: "Log your completed coursework. Visualize your academic velocity and track credit distribution across domains.",
    },
    {
      icon: "fa-solid fa-microchip",
      title: "Gap Analysis",
      description: "Compare your transcript against top degree requirements to identify missing prerequisites and skill voids.",
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
