import AILearningPlanner from "@/components/home/AILearningPlanner";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";

export const dynamic = "force-dynamic";

export default function SmartPlannerPage() {
  return (
    <div className="h-full min-h-0 px-4 pb-4">
      <div className={getDashboardPageHeaderClassName()}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Smart Assist</h1>
          <p className="text-sm text-muted-foreground">
            Generate practical study roadmaps and apply them directly to your schedule.
          </p>
        </div>
      </div>
      <AILearningPlanner />
    </div>
  );
}
