"use client";

import { useEffect, useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Play, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const ACTIVE_SECTION_STORAGE_KEY = "settings_active_section";

const UNIVERSITIES = [
  { id: "mit", name: "MIT" },
  { id: "stanford", name: "Stanford" },
  { id: "cmu", name: "CMU" },
  { id: "ucb", name: "UC Berkeley" },
  { id: "cau", name: "CAU Kiel" },
  { id: "cau-sport", name: "CAU Sport" },
];

export default function SystemMaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [selectedUnis, setSelectedUnis] = useState<string[]>(["mit"]);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [executionMode, setExecutionMode] = useState<"sequential" | "concurrent">("sequential");
  const [forceUpdate, setForceUpdate] = useState(true);
  const [status, setStatus] = useState<{
    type: "idle" | "running" | "success" | "error";
    message?: string;
    runs?: Array<{ label: string; count: number; ok: boolean; error?: string }>;
  }>({ type: "idle" });
  const [recentJobs, setRecentJobs] = useState<
    Array<{
      id: number;
      university: string;
      semester?: string | null;
      status: string;
      job_type?: string | null;
      triggered_by?: string | null;
      course_count?: number | null;
      duration_ms?: number | null;
      error?: string | null;
    }>
  >([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const loadRecentJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await fetch("/api/scraper-jobs/recent");
      const payload = await response.json();
      if (!payload?.error && Array.isArray(payload?.items)) {
        setRecentJobs(payload.items);
      }
    } catch {
      // ignore
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecentJobs();
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("scraper_jobs:live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scraper_jobs" }, () => {
        void loadRecentJobs();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const toggleUni = (id: string) => {
    setSelectedUnis((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  const handleRunScrapers = () => {
    setStatus({ type: "running", message: "Preparing synchronization...", runs: [] });
    if (forceUpdate) {
      try {
        window.localStorage.removeItem(ACTIVE_SECTION_STORAGE_KEY);
      } catch {
        // Ignore storage access errors.
      }
    }

    startTransition(async () => {
      try {
        let totalCount = 0;
        let successCount = 0;
        let completedRuns = 0;
        const errors: string[] = [];
        const runs: Array<{ label: string; count: number; ok: boolean; error?: string }> = [];
        const pairs = selectedUnis.flatMap((uni) => selectedYears.map((year) => ({ uni, year })));
        const expectedRuns = pairs.length;

        const publishProgress = () => {
          setStatus({
            type: "running",
            message: `Running sync... ${completedRuns}/${expectedRuns} finished, ${totalCount} records scraped`,
            runs: [...runs],
          });
        };

        const executePair = async ({ uni, year }: { uni: string; year: number }) => {
          const result = await runManualScraperAction({ university: uni, year, forceUpdate });
          const label = `${uni.toUpperCase()} · ${year}`;
          const perSemesterRuns =
            Array.isArray((result as { runs?: Array<{ semester: string; count: number; success: boolean; error?: string }> }).runs)
              ?
                  (result as { runs?: Array<{ semester: string; count: number; success: boolean; error?: string }> }).runs || []
              : [];
          const subRuns = perSemesterRuns.map((run) => ({
            label: `${uni.toUpperCase()} ${run.semester.toUpperCase()} · ${year}`,
            count: run.count,
            ok: run.success,
            error: run.error,
          }));
          return { label, result, subRuns };
        };

        if (executionMode === "concurrent") {
          await Promise.all(
            pairs.map(async (pair) => {
              const { result, label, subRuns } = await executePair(pair);
              if (result.success) {
                const count = result.count || 0;
                totalCount += count;
                successCount++;
                runs.push({ label, count, ok: true });
                runs.push(...subRuns);
              } else {
                const error = result.error || "Unknown error";
                errors.push(`${label}: ${error}`);
                runs.push({ label, count: 0, ok: false, error });
                runs.push(...subRuns);
              }
              completedRuns += 1;
              publishProgress();
            }),
          );
        } else {
          for (const pair of pairs) {
            const { result, label, subRuns } = await executePair(pair);
            if (result.success) {
              const count = result.count || 0;
              totalCount += count;
              successCount++;
              runs.push({ label, count, ok: true });
              runs.push(...subRuns);
            } else {
              const error = result.error || "Unknown error";
              errors.push(`${label}: ${error}`);
              runs.push({ label, count: 0, ok: false, error });
              runs.push(...subRuns);
            }
            completedRuns += 1;
            publishProgress();
          }
        }

        if (successCount === expectedRuns) {
          setStatus({
            type: "success",
            message: `Synchronization complete. ${totalCount} records scraped across ${expectedRuns} run(s).`,
            runs,
          });
        } else if (successCount > 0) {
          setStatus({
            type: "error",
            message: `Partial success. ${totalCount} records scraped, ${successCount}/${expectedRuns} run(s) succeeded${errors.length > 0 ? `, ${errors.length} failed.` : ""}.`,
            runs,
          });
        } else {
          setStatus({
            type: "error",
            message: `Operation failed: ${errors.join(", ")}`,
            runs,
          });
        }
        await loadRecentJobs();
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred.",
          runs: [],
        });
        await loadRecentJobs();
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Target Institutions</h4>
        <div className="flex flex-wrap gap-2">
          {UNIVERSITIES.map((uni) => {
            const selected = selectedUnis.includes(uni.id);
            return (
              <Button key={uni.id} variant="outline" type="button" onClick={() => toggleUni(uni.id)} disabled={isPending}>
                {uni.name}
                {selected ? <Badge variant="secondary">On</Badge> : null}
              </Button>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Target Years</h4>
        <div className="flex flex-wrap gap-2">
          {yearOptions.map((year) => {
            const selected = selectedYears.includes(year);
            return (
              <Button key={year} variant="outline" type="button" onClick={() => toggleYear(year)} disabled={isPending}>
                {year}
                {selected ? <Badge variant="secondary">On</Badge> : null}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Runs all semesters for each selected year.
        </p>
      </section>

      <Separator />

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Execution</h4>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => setExecutionMode("sequential")} disabled={isPending}>
            One by one {executionMode === "sequential" ? <Badge variant="secondary">Active</Badge> : null}
          </Button>
          <Button variant="outline" type="button" onClick={() => setExecutionMode("concurrent")} disabled={isPending}>
            Concurrent {executionMode === "concurrent" ? <Badge variant="secondary">Active</Badge> : null}
          </Button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={forceUpdate} onCheckedChange={(checked) => setForceUpdate(checked === true)} disabled={isPending} />
          Force update existing records
        </label>
      </section>

      <div className="rounded-sm border p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={handleRunScrapers}
            disabled={isPending || selectedUnis.length === 0 || selectedYears.length === 0}
          >
            {isPending ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
            {isPending ? "Processing..." : "Run Sync"}
          </Button>
        </div>

        {status.type !== "idle" ? (
          <div className="mt-3 rounded-sm border p-3 text-sm">
            <div className="flex items-center gap-2">
              {status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{status.message}</span>
            </div>
            {status.runs && status.runs.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {status.runs.map((run) => (
                  <div key={run.label} className="flex items-center justify-between gap-3">
                    <span className="truncate">{run.label}</span>
                    <span>{run.ok ? `${run.count} scraped` : "failed"}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <Separator />

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Recent Runs</h4>
          <Button variant="outline" type="button" onClick={() => void loadRecentJobs()} disabled={jobsLoading}>
            <RefreshCw className={jobsLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <div className="rounded-sm border">
          {recentJobs.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">No scraper tasks yet.</div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((job) => (
                <div key={job.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {job.university.toUpperCase()} {job.semester ? `· ${job.semester.toUpperCase()}` : ""}
                    </span>
                    <Badge variant="secondary">{job.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.job_type || "courses"} · {job.triggered_by || "manual"} · {job.course_count ?? 0} items · {job.duration_ms ? `${Math.round(job.duration_ms / 1000)}s` : "-"}
                  </p>
                  {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
