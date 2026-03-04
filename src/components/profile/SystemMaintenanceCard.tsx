"use client";

import { useEffect, useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Play, CheckCircle2, AlertCircle, Check, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

const ACTIVE_SECTION_STORAGE_KEY = "settings_active_section";

const UNIVERSITIES = [
{ id: "mit", name: "MIT" },
{ id: "stanford", name: "Stanford" },
{ id: "cmu", name: "CMU" },
{ id: "ucb", name: "UC Berkeley" },
{ id: "cau", name: "CAU Kiel" },
{ id: "cau-sport", name: "CAU Sport" }];


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
    runs?: Array<{label: string;count: number;ok: boolean;error?: string;}>;
  }>({ type: "idle" });
  const [recentJobs, setRecentJobs] = useState<Array<{
    id: number;
    university: string;
    semester?: string | null;
    status: string;
    job_type?: string | null;
    triggered_by?: string | null;
    force_update?: boolean | null;
    course_count?: number | null;
    duration_ms?: number | null;
    created_at?: string | null;
    completed_at?: string | null;
    error?: string | null;
  }>>([]);
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
    } finally {setJobsLoading(false);}};

  useEffect(() => {
    void loadRecentJobs();
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.
    channel("scraper_jobs:live").
    on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scraper_jobs" },
      () => {
        void loadRecentJobs();
      }
    ).
    subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const toggleUni = (id: string) => {
    if (selectedUnis.includes(id)) {
      setSelectedUnis(selectedUnis.filter((u) => u !== id));
    } else {
      setSelectedUnis([...selectedUnis, id]);
    }
  };

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter((y) => y !== year));
    } else {
      setSelectedYears([...selectedYears, year]);
    }
  };

  const handleRunScrapers = () => {
    setStatus({ type: "running", message: "Preparing synchronization...", runs: [] });
    if (forceUpdate) {
      try {
        window.localStorage.removeItem(ACTIVE_SECTION_STORAGE_KEY);
      } catch {



        // Ignore storage access errors.
      }}startTransition(async () => {try {
          let totalCount = 0;
          let successCount = 0;
          let completedRuns = 0;
          const errors: string[] = [];
          const runs: Array<{label: string;count: number;ok: boolean;error?: string;}> = [];
          const pairs = selectedUnis.flatMap((uni) => selectedYears.map((year) => ({ uni, year })));
          const expectedRuns = pairs.length;

          const publishProgress = () => {
            setStatus({
              type: "running",
              message: `Running sync... ${completedRuns}/${expectedRuns} finished, ${totalCount} records scraped`,
              runs: [...runs]
            });
          };

          const executePair = async ({ uni, year }: {uni: string;year: number;}) => {
            const result = await runManualScraperAction({
              university: uni,
              year,
              forceUpdate
            });
            const label = `${uni.toUpperCase()} · ${year}`;
            const perSemesterRuns = Array.isArray((result as {runs?: Array<{semester: string;count: number;success: boolean;error?: string;}>;}).runs) ?
            (result as {runs?: Array<{semester: string;count: number;success: boolean;error?: string;}>;}).runs || [] :
            [];
            const subRuns = perSemesterRuns.map((run) => ({
              label: `${uni.toUpperCase()} ${run.semester.toUpperCase()} · ${year}`,
              count: run.count,
              ok: run.success,
              error: run.error
            }));
            return { uni, year, label, result, subRuns };
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
              })
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
              runs
            });
          } else if (successCount > 0) {
            setStatus({
              type: "error",
              message: `Partial success. ${totalCount} records scraped, ${successCount}/${expectedRuns} run(s) succeeded${errors.length > 0 ? `, ${errors.length} failed.` : ""}.`,
              runs
            });
          } else {
            setStatus({
              type: "error",
              message: `Operation failed: ${errors.join(", ")}`,
              runs
            });
          }
          await loadRecentJobs();
        } catch (error) {
          setStatus({
            type: "error",
            message: error instanceof Error ? error.message : "An unexpected error occurred.",
            runs: []
          });
          await loadRecentJobs();
        }
      });
  };

  return (
    <div className="space-y-4">

      {/* Institution Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#666] block">Target Institutions</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIVERSITIES.map((uni) => {
            const isSelected = selectedUnis.includes(uni.id);
            return (
              <Button variant="outline"
              key={uni.id}
              onClick={() => toggleUni(uni.id)}
              disabled={isPending}>





                
                {uni.name}
                {isSelected && <Check className="ml-2" />}
              </Button>);

          })}
        </div>
      </div>

      {/* Year Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#666] block">Target Year</label>
        <div className="flex flex-wrap gap-2">
          {yearOptions.map((year) => {
            const isSelected = selectedYears.includes(year);
            return (
              <Button variant="outline"
              key={year}
              onClick={() => toggleYear(year)}
              disabled={isPending}>





                
                {year}
                {isSelected && <Check className="ml-2" />}
              </Button>);

          })}
        </div>
        <p className="text-[11px] text-[#777]">
          Runs all semesters for each selected year (CAU/CAU Sport run winter + spring terms for each year).
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#666] block">Execution Mode</label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"
          onClick={() => setExecutionMode("sequential")}
          disabled={isPending}>





            
            One by one
          </Button>
          <Button variant="outline"
          onClick={() => setExecutionMode("concurrent")}
          disabled={isPending}>





            
            Concurrent
          </Button>
        </div>
      </div>

      {/* Action Area */}
      <Card>
        <label className="inline-flex items-center gap-2 text-xs text-[#555] select-none">
          <Checkbox
            checked={forceUpdate}
            onCheckedChange={(checked) => setForceUpdate(checked === true)}
            disabled={isPending} />
          
          <span>Force update existing record</span>
        </label>

        <Button variant="outline"
        onClick={handleRunScrapers}
        disabled={isPending || selectedUnis.length === 0 || selectedYears.length === 0}>

          
          {isPending ?
          <>
              <Loader2 className="animate-spin" />
              Processing...
            </> :

          <>
              <Play className="fill-current" />
              Run Sync
            </>
          }
        </Button>

        {status.type !== "idle" &&
        <div className={` border px-3 py-2 text-xs font-medium ${
        status.type === "success" ?
        "bg-emerald-50 border-emerald-100 text-emerald-700" :
        "bg-red-50 border-red-100 text-red-700"} animate-in fade-in duration-300`
        }>
            <div className="flex items-center gap-2">
              {status.type === "success" ?
            <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> :

            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            }
              <span>{status.message}</span>
            </div>
            {status.runs && status.runs.length > 0 ?
          <Card>
                {status.runs.map((run) =>
            <div key={run.label} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="opacity-90">{run.label}</span>
                    <span className="font-semibold">
                      {run.ok ? `${run.count} scraped` : "failed"}
                    </span>
                  </div>
            )}
              </Card> :
          null}
          </div>
        }
      </Card>

      <div className="pt-3 border-t border-[#efefef]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#666] block">Recent Scraper Tasks (10)</label>
          <Button variant="outline"
          onClick={() => void loadRecentJobs()}
          disabled={jobsLoading}>

            
            <RefreshCw className={`w-3 h-3 ${jobsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Card>
          {recentJobs.length === 0 ?
          <div className="px-3 py-3 text-[12px] text-[#888]">No scraper tasks yet.</div> :

          <div className="divide-y divide-[#f1f1f1]">
              {recentJobs.map((job) =>
            <div key={job.id} className="px-3 py-2 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#222]">
                      {job.university.toUpperCase()} {job.semester ? `· ${job.semester.toUpperCase()}` : ""}
                    </span>
                    <span className="text-[#666]">{job.status}</span>
                  </div>
                  <div className="mt-1 text-[#777] flex items-center justify-between gap-2">
                    <span>
                      {job.job_type || "courses"} · {job.triggered_by || "manual"} · {job.course_count ?? 0} items
                    </span>
                    <span>{job.duration_ms ? `${Math.round(job.duration_ms / 1000)}s` : "-"}</span>
                  </div>
                  {job.error ? <div className="mt-1 text-[#b84a4a] truncate">{job.error}</div> : null}
                </div>
            )}
            </div>
          }
        </Card>
      </div>
    </div>);

}