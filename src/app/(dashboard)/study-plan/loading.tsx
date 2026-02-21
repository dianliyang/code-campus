export default function StudyPlanLoading() {
  return (
    <main className="w-full animate-pulse">
      <div className="space-y-4">
        {/* Stats strip — mirrors StudyPlanHeader */}
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] grid grid-cols-2 lg:grid-cols-4">
          <div className="px-4 py-3 border-r border-b lg:border-b-0 border-[#e5e5e5]">
            <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
            <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
          </div>
          <div className="px-4 py-3 border-b lg:border-b-0 lg:border-r border-[#e5e5e5]">
            <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
            <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
          </div>
          <div className="px-4 py-3 border-r border-[#e5e5e5]">
            <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
            <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
          </div>
          <div className="px-4 py-3">
            <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
            <div className="h-7 w-12 bg-[#e8e8e8] rounded mt-2" />
          </div>
        </div>

        {/* Calendar section */}
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
          <div className="h-4 w-40 bg-[#f0f0f0] rounded" />
          <div className="h-48 bg-[#f5f5f5] rounded-lg" />
        </div>

        {/* AI Learning Planner section */}
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-2">
          <div className="h-4 w-36 bg-[#f0f0f0] rounded" />
          <div className="h-3 w-52 bg-[#f5f5f5] rounded" />
          <div className="h-20 bg-[#f5f5f5] rounded-lg mt-1" />
        </div>

        {/* Active courses section */}
        <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
          <div className="h-4 w-32 bg-[#f0f0f0] rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="h-28 bg-[#f5f5f5] rounded-lg" />
            <div className="h-28 bg-[#f5f5f5] rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}
