"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { runManualScraperAction } from "@/actions/scrapers";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Play, CheckCircle2, AlertCircle, RefreshCw, Landmark, CalendarRange, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { useCachedJsonResource } from "@/hooks/useCachedJsonResource";

const ACTIVE_SECTION_STORAGE_KEY = "settings_active_section";

const UNIVERSITIES = [
  { id: "mit", name: "MIT" },
  { id: "stanford", name: "Stanford" },
  { id: "cmu", name: "CMU" },
  { id: "ucb", name: "UC Berkeley" },
  { id: "cau", name: "CAU Kiel" },
  { id: "cau-sport", name: "CAU Sport" },
];

const UNIVERSITY_LOGO_PATHS: Record<string, string> = {
  mit: "/mit-text.png",
  stanford: "/stanford-text.png",
  cmu: "/cmu-text.svg",
  ucb: "/ucb-text.png",
  cau: "/cau-text.png",
  "cau-sport": "/cau-text.png",
};

const HIDDEN_SELECTOR_UNIVERSITY_IDS = new Set(["cau-sport"]);

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
  const jobsFetchInit = useMemo(() => ({ cache: "no-store" } as RequestInit), []);
  const { data: recentJobsPayload, loading: jobsLoading, refresh: refreshRecentJobs } =
    useCachedJsonResource<{
      items?: Array<{
        id: number;
        university: string;
        semester?: string | null;
        status: string;
        job_type?: string | null;
        triggered_by?: string | null;
        course_count?: number | null;
        duration_ms?: number | null;
        error?: string | null;
      }>;
    }>({
      cacheKey: "cc:cached-json:scraper-jobs",
      url: "/api/scraper-jobs/recent",
      ttlMs: 60_000,
      init: jobsFetchInit,
    });
  const recentJobs = Array.isArray(recentJobsPayload?.items) ? recentJobsPayload.items : [];

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("scraper_jobs:live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scraper_jobs" }, () => {
        void refreshRecentJobs().catch(() => null);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshRecentJobs]);

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
        await refreshRecentJobs().catch(() => null);
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "An unexpected error occurred.",
          runs: [],
        });
        await refreshRecentJobs().catch(() => null);
      }
    });
  };

  return (
    <div
      data-testid="system-maintenance-scroll"
      className="h-full min-h-0 space-y-4 overflow-y-auto pb-12"
    >
      <div className="overflow-x-auto pb-1" data-testid="sync-stats-row">
        <div className="flex min-w-max gap-2.5 sm:gap-3">
          <Card className="min-w-[170px] flex-1 overflow-hidden">
            <CardContent className="flex h-24 flex-col justify-between px-4 py-3">
              <div className="flex items-start gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Institutions</p>
              </div>
              <p className="mt-auto text-2xl font-bold tracking-tight leading-none">{selectedUnis.length}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[170px] flex-1 overflow-hidden">
            <CardContent className="flex h-24 flex-col justify-between px-4 py-3">
              <div className="flex items-start gap-2">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Years</p>
              </div>
              <p className="mt-auto text-2xl font-bold tracking-tight leading-none">{selectedYears.length}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[170px] flex-1 overflow-hidden">
            <CardContent className="flex h-24 flex-col justify-between px-4 py-3">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Execution Mode</p>
              </div>
              <p className="mt-auto text-base font-bold capitalize leading-none">{executionMode}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Synchronization Controls</CardTitle>
            <CardDescription>Choose targets and execution policy, then run sync.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Target Institutions</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {UNIVERSITIES.filter((uni) => !HIDDEN_SELECTOR_UNIVERSITY_IDS.has(uni.id)).map((uni) => (
                  <Toggle
                    key={uni.id}
                    variant="outline"
                    pressed={selectedUnis.includes(uni.id)}
                    onPressedChange={() => toggleUni(uni.id)}
                    disabled={isPending}
                    aria-label={uni.name}
                    title={uni.name}
                    className="h-20 w-full rounded-xl px-0 py-0 data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:border-black data-[state=on]:border-2"
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-lg bg-muted/20 px-3 py-2.5">
                      <Image
                        src={UNIVERSITY_LOGO_PATHS[uni.id]}
                        alt={uni.name}
                        width={120}
                        height={28}
                        className="h-auto w-auto max-h-8 max-w-[72%] object-contain"
                        unoptimized
                      />
                    </span>
                  </Toggle>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Target Years</h4>
              <div className="flex flex-wrap gap-2">
                {yearOptions.map((year) => (
                  <Toggle
                    key={year}
                    variant="outline"
                    pressed={selectedYears.includes(year)}
                    onPressedChange={() => toggleYear(year)}
                    disabled={isPending}
                    className="data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:border-black data-[state=on]:border-2"
                  >
                    {year}
                  </Toggle>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Runs all semesters for each selected year.</p>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Execution</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Toggle
                  variant="outline"
                  pressed={executionMode === "sequential"}
                  onPressedChange={(pressed) => {
                    if (pressed) setExecutionMode("sequential");
                  }}
                  disabled={isPending}
                  className="w-full data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:border-black data-[state=on]:border-2"
                >
                  Sequential
                </Toggle>
                <Toggle
                  variant="outline"
                  pressed={executionMode === "concurrent"}
                  onPressedChange={(pressed) => {
                    if (pressed) setExecutionMode("concurrent");
                  }}
                  disabled={isPending}
                  className="w-full data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:border-black data-[state=on]:border-2"
                >
                  Concurrent
                </Toggle>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={forceUpdate} onCheckedChange={(checked) => setForceUpdate(checked === true)} disabled={isPending} />
                Force update existing records
              </label>
            </section>

            <section className="space-y-3">
              <Button
                variant="outline"
                type="button"
                onClick={handleRunScrapers}
                disabled={isPending || selectedUnis.length === 0 || selectedYears.length === 0}
                className="w-full"
              >
                {isPending ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
                {isPending ? "Processing..." : "Run Sync"}
              </Button>

              {status.type !== "idle" ? (
                <Card>
                  <CardContent className="text-sm">
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
                  </CardContent>
                </Card>
              ) : null}
            </section>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Recent Runs</CardTitle>
                  <CardDescription>Latest scraper tasks and outcomes.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" type="button" onClick={() => void refreshRecentJobs().catch(() => null)} disabled={jobsLoading}>
                  <RefreshCw className={jobsLoading ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentJobs.length === 0 ? (
                <div className="text-xs text-muted-foreground">No scraper tasks yet.</div>
              ) : (
                <div className="space-y-4">
                  {recentJobs.map((job, idx) => (
                    <div key={job.id}>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {job.university.toUpperCase()} {job.semester ? `· ${job.semester.toUpperCase()}` : ""}
                          </span>
                          <div title={job.status}>
                            {String(job.status || "").toLowerCase() === "success" || String(job.status || "").toLowerCase() === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : String(job.status || "").toLowerCase() === "failed" ? (
                              <AlertCircle className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {job.job_type || "courses"} · {job.triggered_by || "manual"} · {job.course_count ?? 0} items · {job.duration_ms ? `${Math.round(job.duration_ms / 1000)}s` : "-"}
                        </p>
                        {job.error ? <p className="mt-1 text-xs text-destructive line-clamp-2" title={job.error}>{job.error}</p> : null}
                      </div>
                      {idx < recentJobs.length - 1 && <div className="mt-4 border-b border-border/50" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
