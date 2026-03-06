import {
  BookOpen,
  Map,
  Sparkles,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  MessageSquare,
  LifeBuoy
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <main className="h-full w-full px-4 py-4 space-y-6 overflow-y-auto">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-background/95 px-4 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-stone-900" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Help Center</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Master the architecture of your academic record.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-stone-900" />
              <CardTitle className="text-base">Quick Start: Smart Assist</CardTitle>
            </div>
            <CardDescription>Get your AI study plan running in seconds.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. <strong>Enroll</strong>: Join courses from the global catalog.</p>
            <p>2. <strong>Ingest</strong>: Visit the course detail page and click &quot;Generate Intelligence&quot;.</p>
            <p>3. <strong>Plan</strong>: Use the &quot;Assist&quot; tab to generate a custom study schedule.</p>
            <p>4. <strong>Sync</strong>: Apply the plan to your active roadmap and calendar.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-stone-900" />
              <CardTitle className="text-base">Roadmap & Progress</CardTitle>
            </div>
            <CardDescription>Tracking your academic mastery over time.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>The <strong>Roadmap</strong> view provides a bird&apos;s-eye view of all your enrolled courses.</p>
            <p><strong>Mastery</strong> is calculated based on completed course units and verified credits. You can update your progress manually or via synchronized study logs.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-stone-900" />
              <CardTitle className="text-base">Study Calendar</CardTitle>
            </div>
            <CardDescription>Managing your weekly execution.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>The <strong>Calendar</strong> displays your recurring study sessions and one-off tasks.</p>
            <p>Click on any event to see detailed logistics (location, time) or to mark a specific task as <strong>completed</strong>.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-stone-900" />
              <CardTitle className="text-base">Workout Workflows</CardTitle>
            </div>
            <CardDescription>Physical balance for mental performance.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Discover fitness courses and university workout sessions in the <strong>Workouts</strong> tab.</p>
            <p>Enrolled workouts appear in your daily <strong>Overview</strong> and calendar automatically.</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Core Concepts</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/5">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Registry Code</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Unique alphanumeric identifiers used by universities to index their curricula (e.g., CS106A).</p>
          </div>
          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/5">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Data Ingestion</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">The process of extracting structured data from raw course syllabi using Athena&apos;s AI engine.</p>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/5">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Smart Review</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">Our upcoming module for automated rubric-aware feedback on labs and project drafts.</p>
          </div>
        </div>
      </section>

      <div className="rounded-2xl bg-stone-900 text-white p-8">
        <h2 className="text-xl font-medium mb-2">Need more assistance?</h2>
        <p className="text-stone-400 text-sm mb-6 max-w-lg">
          Our system documentation is constantly evolving. If you find a bug or have a feature request, please use the project repository issues.
        </p>
        <div className="flex flex-wrap gap-3">
          <a 
            href="https://github.com/dianliyang/athena-web" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white text-stone-900 text-sm font-medium rounded-md hover:bg-stone-100 transition-colors"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </main>
  );
}
