"use client";

import { useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, Check, RefreshCw } from "lucide-react";

const UNIVERSITIES = [
  { id: "mit", name: "MIT" },
  { id: "stanford", name: "Stanford" },
  { id: "cmu", name: "CMU" },
  { id: "ucb", name: "UC Berkeley" },
];

const SEMESTERS = [
  { id: "fa25", name: "Fall 2025" },
  { id: "wi25", name: "Winter 2025/26" },
  { id: "sp26", name: "Spring 2026" },
  { id: "su26", name: "Summer 2026" },
  { id: "fa26", name: "Fall 2026" },
];

export default function SystemMaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [selectedUnis, setSelectedUnis] = useState<string[]>(["mit"]);
  const [selectedSems, setSelectedSems] = useState<string[]>([SEMESTERS[2].id]);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  const toggleUni = (id: string) => {
    if (selectedUnis.includes(id)) {
      if (selectedUnis.length > 1) {
        setSelectedUnis(selectedUnis.filter(u => u !== id));
      }
    } else {
      setSelectedUnis([...selectedUnis, id]);
    }
  };

  const toggleSem = (id: string) => {
    if (selectedSems.includes(id)) {
      if (selectedSems.length > 1) {
        setSelectedSems(selectedSems.filter(s => s !== id));
      }
    } else {
      setSelectedSems([...selectedSems, id]);
    }
  };

  const handleRunScrapers = () => {
    setStatus({ type: "idle" });
    startTransition(async () => {
      try {
        let totalCount = 0;
        let successCount = 0;
        const errors: string[] = [];

        for (const uni of selectedUnis) {
          for (const sem of selectedSems) {
          const result = await runManualScraperAction({
            university: uni,
            semester: sem,
            forceUpdate
          });
          
          if (result.success) {
            totalCount += result.count || 0;
            successCount++;
          } else {
            errors.push(`${uni.toUpperCase()}: ${result.error}`);
          }
        }
        }
        
        if (successCount === selectedUnis.length) {
          setStatus({ 
            type: "success", 
            message: `Synchronization complete. ${totalCount} records processed across ${successCount} institutions.` 
          });
        } else if (successCount > 0) {
          setStatus({ 
            type: "error", 
            message: `Partial success. ${totalCount} records processed, but ${errors.length} failed: ${errors.join(", ")}` 
          });
        } else {
          setStatus({ 
            type: "error", 
            message: `Operation failed: ${errors.join(", ")}` 
          });
        }
      } catch (error) {
        setStatus({ 
          type: "error", 
          message: error instanceof Error ? error.message : "An unexpected error occurred." 
        });
      }
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-3 text-gray-900 mb-8 pb-4 border-b border-gray-50">
        <RefreshCw className="w-5 h-5 text-brand-blue" />
        <span className="text-sm font-bold uppercase tracking-[0.1em]">Data Synchronization</span>
      </div>

      {/* Institution Selection */}
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Institutions</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIVERSITIES.map((uni) => {
            const isSelected = selectedUnis.includes(uni.id);
            return (
              <button
                key={uni.id}
                onClick={() => toggleUni(uni.id)}
                disabled={isPending}
                className={`flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${
                  isSelected 
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-700"
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
      <div className="space-y-4">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Target Semester</label>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.map((sem) => {
            const isSelected = selectedSems.includes(sem.id);
            return (
              <button
                key={sem.id}
                onClick={() => toggleSem(sem.id)}
                disabled={isPending}
                className={`flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg border-2 transition-all ${
                  isSelected 
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-700"
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
      <div className="pt-6 border-t border-gray-50 flex flex-col gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={forceUpdate}
            onChange={e => setForceUpdate(e.target.checked)}
            className="accent-red-500 w-3.5 h-3.5"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 group-hover:text-gray-700 transition-colors">
            Force Update <span className="text-gray-400 normal-case tracking-normal font-bold">(override existing course data)</span>
          </span>
        </label>
        <button
          onClick={handleRunScrapers}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2.5 h-11 bg-gray-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-black transition-all disabled:opacity-50 shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              Execute Sync Pattern
            </>
          )}
        </button>

        {status.type !== "idle" && (
          <div className={`p-3 rounded-lg border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${
            status.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : "bg-red-50 border-red-100 text-red-700"
          } animate-in fade-in duration-300`}>
            {status.type === "success" ? (
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
