import { MessageCircle, MoreVertical, Phone, Video } from "lucide-react";
import { User } from "@supabase/supabase-js";

export default function RightActivityRail({ user }: { user: User | null }) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest User";
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "@guest";

  return (
    <aside className="hidden xl:flex xl:w-80 shrink-0 border-l border-slate-200 bg-slate-50 rounded-r-3xl p-4 flex-col gap-4">
      <section className="rounded-2xl bg-slate-100 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white border border-slate-200 mx-auto mb-3 flex items-center justify-center text-slate-700 font-bold">
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <h3 className="text-sm font-semibold text-slate-900">{displayName}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{handle}</p>

        <div className="mt-4 flex justify-center gap-2">
          {[Phone, Video, MoreVertical].map((Icon, idx) => (
            <button key={idx} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 inline-flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </section>

      <section className="flex-1 rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-900">Activity</h4>
          <MessageCircle className="w-4 h-4 text-slate-400" />
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-800">System</p>
            <p className="text-slate-500 text-xs">Track course progress and weekly goals here.</p>
          </div>
          <div>
            <p className="font-medium text-slate-800">Planner</p>
            <p className="text-slate-500 text-xs">Review your roadmap and schedule upcoming sessions.</p>
          </div>
          <div>
            <p className="font-medium text-slate-800">Catalog</p>
            <p className="text-slate-500 text-xs">Browse universities and compare course options.</p>
          </div>
        </div>
      </section>
    </aside>
  );
}
