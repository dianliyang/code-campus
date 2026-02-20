export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-gray-200" />
          <div className="space-y-2">
            <div className="h-6 w-52 rounded bg-gray-200" />
            <div className="h-4 w-72 rounded bg-gray-100" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-[#e5e5e5] bg-[#fcfcfc]">
        <div className="h-20 border-r border-b lg:border-b-0 border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 border-r border-[#e5e5e5] bg-gray-100/60" />
        <div className="h-20 bg-gray-100/60" />
      </div>

      <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <div className="h-5 w-52 rounded bg-gray-200" />
            <div className="h-4 w-60 rounded bg-gray-100" />
            <div className="h-12 rounded-md border border-[#e5e5e5] bg-white" />
            <div className="h-12 rounded-md border border-[#e5e5e5] bg-white" />
            <div className="h-12 rounded-md border border-[#e5e5e5] bg-white" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="h-4 w-40 rounded bg-gray-100" />
            <div className="h-10 rounded-md border border-[#e5e5e5] bg-white" />
            <div className="h-10 rounded-md border border-[#e5e5e5] bg-white" />
            <div className="h-10 rounded-md border border-[#e5e5e5] bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
