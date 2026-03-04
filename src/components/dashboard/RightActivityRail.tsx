import { MessageCircle, MoreVertical, Phone, Video } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

export default function RightActivityRail({ user }: {user: User | null;}) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest User";
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "@guest";

  return (
    <Card>
      <section className=" bg-slate-100 p-6 text-center">
        <Card>
          {displayName.slice(0, 1).toUpperCase()}
        </Card>
        <h3 className="text-sm font-semibold text-slate-900">{displayName}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{handle}</p>

        <div className="mt-4 flex justify-center gap-2">
          {[Phone, Video, MoreVertical].map((Icon, idx) =>
          <Button variant="outline" size="icon" key={idx}>
              <Icon />
            </Button>
          )}
        </div>
      </section>

      <Card>
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
      </Card>
    </Card>);

}