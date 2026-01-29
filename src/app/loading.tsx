export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-6">
        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        <div className="h-3 bg-slate-200 rounded w-32"></div>
      </div>
    </div>
  );
}
