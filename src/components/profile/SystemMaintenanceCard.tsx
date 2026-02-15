"use client";

import { useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, Check } from "lucide-react";

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

export default function SystemMaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [selectedUnis, setSelectedUnis] = useState<string[]>(["cau"]);
  const [selectedSem, setSelectedSem] = useState(SEMESTERS[2].id);
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

  const handleRunScrapers = () => {
    setStatus({ type: "idle" });
    startTransition(async () => {
      try {
        let totalCount = 0;
        let successCount = 0;
        const errors: string[] = [];

        for (const uni of selectedUnis) {
          const result = await runManualScraperAction({
            university: uni,
            semester: selectedSem
          });
          
          if (result.success) {
            totalCount += result.count || 0;
            successCount++;
          } else {
            errors.push(`${uni.toUpperCase()}: ${result.error}`);
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
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
      {/* Institution Selection */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Target Institutions</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {UNIVERSITIES.map((uni) => {
            const isSelected = selectedUnis.includes(uni.id);
            return (
              <button
                key={uni.id}
                onClick={() => toggleUni(uni.id)}
                disabled={isPending}
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                  isSelected 
                    ? "bg-gray-900 border-gray-900 text-white shadow-sm" 
                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700"
                } disabled:opacity-50`}
              >
                {uni.name}
                {isSelected && <Check className="w-3.5 h-3.5 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Semester Selection */}
      <div className="space-y-4">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Target Semester</label>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.map((sem) => {
            const isSelected = selectedSem === sem.id;
            return (
              <button
                key={sem.id}
                onClick={() => setSelectedSem(sem.id)}
                disabled={isPending}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                  isSelected 
                    ? "bg-gray-50 border-gray-900 text-gray-900" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                } disabled:opacity-50`}
              >
                {sem.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-6 border-t border-gray-50 flex flex-col gap-4">
        <button
          onClick={handleRunScrapers}
          disabled={isPending}
          className="flex items-center justify-center gap-2.5 h-11 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm w-full sm:w-auto sm:px-12"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Sequential Sync...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Execute Sync Pattern
            </>
          )}
        </button>

        {status.type !== "idle" && (
          <div className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-3 ${
            status.type === "success" 
              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
              : "bg-red-50 border-red-100 text-red-700"
          } animate-in fade-in slide-in-from-top-1 duration-300`}>
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
