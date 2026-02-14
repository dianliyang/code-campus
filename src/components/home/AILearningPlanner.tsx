"use client";

export default function AILearningPlanner() {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-2xl p-8 relative overflow-hidden">
      <div className="relative z-10">
        <h4 className="text-lg font-bold text-violet-900 mb-2">
          AI Learning Planner
        </h4>
        <p className="text-sm text-violet-600 max-w-md mb-6 leading-relaxed">
          Our neural engine is analyzing your academic history to generate personalized course recommendations. This feature is currently in beta.
        </p>
        <button disabled className="px-5 py-2.5 bg-violet-100 text-violet-400 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border border-violet-200">
          Coming Soon
        </button>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-violet-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-100/50 rounded-full blur-3xl"></div>
    </div>
  );
}
