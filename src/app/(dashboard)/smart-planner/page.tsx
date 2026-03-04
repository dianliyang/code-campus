import AILearningPlanner from "@/components/home/AILearningPlanner";

export const dynamic = "force-dynamic";

export default function SmartPlannerPage() {
  return (
    <div className="h-full space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Smart Assist</h1>
        <p className="text-sm text-muted-foreground">
          Generate practical study roadmaps and apply them directly to your schedule.
        </p>
      </div>
      <AILearningPlanner />
    </div>
  );
}
