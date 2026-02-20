"use client";

export default function AILearningPlanner() {
  return (
    <div className="rounded-md border border-[#e5e5e5] bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-[#222] mb-1">
          AI Learning Planner
        </h4>
        <p className="text-xs text-[#666] max-w-md mb-4 leading-relaxed">
          Our neural engine is analyzing your academic history to generate personalized course recommendations. This feature is currently in beta.
        </p>
        <button disabled className="h-8 rounded-md border border-[#d8d8d8] bg-[#f8f8f8] px-3 text-[12px] font-medium text-[#888] cursor-not-allowed">
          Coming Soon
        </button>
      </div>
    </div>
  );
}
