"use client";

import { useEffect, useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, Check, RefreshCw } from "lucide-react";

const UNIVERSITIES = [
  { id: "mit", name: "MIT" },
  { id: "stanford", name: "Stanford" },
  { id: "cmu", name: "CMU" },
  { id: "ucb", name: "UC Berkeley" },
  { id: "cau", name: "CAU Kiel" },
  { id: "cau-sport", name: "CAU Sport" },
];

const SEMESTERS = [
  { id: "fa25", name: "Fall 2025" },
  { id: "wi25", name: "Winter 2025/26" },
  { id: "sp26", name: "Spring 2026" },
  { id: "su26", name: "Summer 2026" },
  { id: "fa26", name: "Fall 2026" },
];

function normalizeSemesterForSync(university: string, semesterId: string): string {
  const sem = semesterId.toLowerCase();
  const year = Number((sem.match(/\d{2}/)?.[0] || "25"));

  if (university === "cau" || university === "cau-sport") {
    if (sem.startsWith("wi") || sem.startsWith("fa") || sem.includes("winter") || sem.includes("fall")) {
      return `${university}:w${year}`;
    }
    if (sem.startsWith("sp") || sem.startsWith("su") || sem.includes("spring") || sem.includes("summer")) {
      return `${university}:s${year}`;
    }
  }

  return `${university}:${semesterId}`;
}

export default function SystemMaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [selectedUnis, setSelectedUnis] = useState<string[]>(["mit"]);
  const [selectedSems, setSelectedSems] = useState<string[]>([SEMESTERS[2].id]);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
    runs?: Array<{ label: string; count: number; ok: boolean; error?: string }>;
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
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecentJobs();
  }, []);

  const toggleUni = (id: string) => {
    if (selectedUnis.includes(id)) {
      setSelectedUnis(selectedUnis.filter(u => u !== id));
    } else {
      setSelectedUnis([...selectedUnis, id]);
    }
  };

  const toggleSem = (id: string) => {
    if (selectedSems.includes(id)) {
      setSelectedSems(selectedSems.filter(s => s !== id));
    } else {
      setSelectedSems([...selectedSems, id]);
    }
  };

  const handleRunScrapers = () => {
    setStatus({ type: "idle", runs: [] });
    startTransition(async () => {
      try {
        let totalCount = 0;
        let successCount = 0;
        const errors: string[] = [];
        const dedupedRunMap = new Map<string, { uni: string; sem: string }>();
        for (const uni of selectedUnis) {
          for (const sem of selectedSems) {
            dedupedRunMap.set(normalizeSemesterForSync(uni, sem), { uni, sem });
          }
        }
        const dedupedRuns = Array.from(dedupedRunMap.values());
        const expectedRuns = dedupedRuns.length;
        const runs: Array<{ label: string; count: number; ok: boolean; error?: string }> = [];

        for (const { uni, sem } of dedupedRuns) {
          const result = await runManualScraperAction({
            university: uni,
            semester: sem,
            forceUpdate,
          });
          const label = `${uni.toUpperCase()} ${sem.toUpperCase()}`;

          if (result.success) {
            const count = result.count || 0;
            totalCount += count;
            successCount++;
            runs.push({ label, count, ok: true });
          } else {
            const error = result.error || "Unknown error";
            errors.push(`${label}: ${error}`);
            runs.push({ label, count: 0, ok: false, error });
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
    <div className="bg-white border border-[#e5e5e5] rounded-md p-4 space-y-4">
      <div className="flex items-center gap-2 text-[#222] mb-3 pb-3 border-b border-[#efefef]">
        <RefreshCw className="w-4 h-4 text-[#777]" />
        <span className="text-sm font-semibold">Data Synchronization</span>
      </div>

      {/* Institution Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#666] block">Target Institutions</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIVERSITIES.map((uni) => {
            const isSelected = selectedUnis.includes(uni.id);
            return (
              <button
                key={uni.id}
                onClick={() => toggleUni(uni.id)}
                disabled={isPending}
                className={`flex items-center justify-between h-8 px-2.5 rounded-md border transition-colors text-[13px] font-medium ${
                  isSelected 
                    ? "bg-[#1f1f1f] border-[#1f1f1f] text-white" 
                    : "bg-white border-[#d8d8d8] text-[#666] hover:bg-[#f8f8f8]"
                } disabled:opacity-50`}
              >
                {uni.name}
                {isSelected && <Check className="w-3 h-3 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Semester Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[#666] block">Target Semester</label>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.map((sem) => {
            const isSelected = selectedSems.includes(sem.id);
            return (
              <button
                key={sem.id}
                onClick={() => toggleSem(sem.id)}
                disabled={isPending}
                className={`flex items-center justify-between h-8 px-2.5 rounded-md border transition-colors text-[13px] font-medium ${
                  isSelected 
                    ? "bg-[#1f1f1f] border-[#1f1f1f] text-white" 
                    : "bg-white border-[#d8d8d8] text-[#666] hover:bg-[#f8f8f8]"
                } disabled:opacity-50`}
              >
                {sem.name}
                {isSelected && <Check className="w-3 h-3 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-3 border-t border-[#efefef] flex flex-col gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-[#555] select-none">
          <input
            type="checkbox"
            checked={forceUpdate}
            onChange={(event) => setForceUpdate(event.target.checked)}
            disabled={isPending}
            className="h-3.5 w-3.5 rounded border-[#cfcfcf] text-[#1f1f1f] focus:ring-0"
          />
          <span>Force update existing records</span>
        </label>

        <button
          onClick={handleRunScrapers}
          disabled={isPending || selectedUnis.length === 0 || selectedSems.length === 0}
          className="w-full h-8 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              Run Sync
            </>
          )}
        </button>

        {status.type !== "idle" && (
          <div className={`rounded-md border px-3 py-2 text-xs font-medium ${
            status.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : "bg-red-50 border-red-100 text-red-700"
          } animate-in fade-in duration-300`}>
            <div className="flex items-center gap-2">
              {status.type === "success" ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
            {status.runs && status.runs.length > 0 ? (
              <div className="mt-2 border-t border-current/20 pt-2 space-y-1">
                {status.runs.map((run) => (
                  <div key={run.label} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="opacity-90">{run.label}</span>
                    <span className="font-semibold">
                      {run.ok ? `${run.count} scraped` : "failed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-[#efefef]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[#666] block">Recent Scraper Tasks (10)</label>
          <button
            onClick={() => void loadRecentJobs()}
            disabled={jobsLoading}
            className="text-[11px] text-[#555] hover:text-[#111] inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${jobsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="rounded-md border border-[#e6e6e6] overflow-hidden">
          {recentJobs.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-[#888]">No scraper tasks yet.</div>
          ) : (
            <div className="divide-y divide-[#f1f1f1]">
              {recentJobs.map((job) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
