export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-[#e5e5e5] bg-[#fcfcfc]">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className={`px-4 py-3 ${idx % 2 === 0 ? "border-r border-[#e5e5e5] lg:border-r" : "lg:border-r lg:border-[#e5e5e5]"} ${idx >= 2 ? "border-t border-[#e5e5e5] lg:border-t-0" : ""} ${idx === 3 ? "lg:border-r-0" : ""}`}
          >
            <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
            <div className="h-7 w-16 bg-[#e8e8e8] rounded mt-2" />
          </div>
        ))}
      </div>

      {/* List header */}
      <div className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] px-4 py-2">
        <div className="h-4 w-24 bg-[#f0f0f0] rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-16 bg-[#f0f0f0] rounded" />
        </div>
      </div>

      {/* Course rows */}
      <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]"} ${i > 0 ? "border-t border-[#f0f0f0]" : ""}`}>
            <div className="h-4 w-4 rounded bg-[#ebebeb]" />
            <div className="h-6 w-6 rounded-md bg-[#ebebeb]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 bg-[#ebebeb] rounded" />
              <div className="h-3 w-1/3 bg-[#f2f2f2] rounded" />
            </div>
            <div className="hidden md:flex gap-1 w-[18%]">
              <div className="h-5 w-12 bg-[#f0f0f0] rounded" />
              <div className="h-5 w-14 bg-[#f0f0f0] rounded" />
            </div>
            <div className="hidden md:block w-[10%]">
              <div className="h-5 w-16 bg-[#f0f0f0] rounded-full" />
            </div>
            <div className="hidden md:block w-[8%]">
              <div className="h-4 w-6 bg-[#f2f2f2] rounded" />
            </div>
            <div className="w-[5%] flex justify-end">
              <div className="h-8 w-8 bg-[#f0f0f0] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
