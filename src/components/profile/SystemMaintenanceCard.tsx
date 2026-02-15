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
            message: `Successfully processed ${totalCount} records across ${successCount} institutions.` 
          });
        } else if (successCount > 0) {
          setStatus({ 
            type: "error", 
            message: `Partial success. Processed ${totalCount} records, but ${errors.length} failed: ${errors.join(", ")}` 
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
    <section id="maintenance" className="pt-12 border-t border-gray-100">
      <div className="max-w-3xl">
        <header className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">System Operations</h3>
          <p className="text-sm text-gray-500">Synchronize academic catalogs and manage data integrity.</p>
        </header>

        <div className="space-y-8">
          {/* Institution Selection */}
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-tight">Target Institutions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {UNIVERSITIES.map((uni) => {
                const isSelected = selectedUnis.includes(uni.id);
                return (
                  <button
                    key={uni.id}
                    onClick={() => toggleUni(uni.id)}
                    disabled={isPending}
                    className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium border transition-all ${
                      isSelected 
                        ? "bg-black border-black text-white" 
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-900"
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
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-tight">Target Semester</label>
            <div className="flex flex-wrap gap-2">
              {SEMESTERS.map((sem) => {
                const isSelected = selectedSem === sem.id;
                return (
                  <button
                    key={sem.id}
                    onClick={() => setSelectedSem(sem.id)}
                    disabled={isPending}
                    className={`px-4 py-2 text-xs font-medium border transition-all ${
                      isSelected 
                        ? "bg-black border-black text-white" 
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-900"
                    } disabled:opacity-50`}
                  >
                    {sem.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-4 flex flex-col gap-4">
            <button
              onClick={handleRunScrapers}
              disabled={isPending}
              className="group flex items-center justify-center gap-3 h-11 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 w-full sm:w-auto sm:px-12"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing_Catalogs...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Initialize_Scrape
                </>
              )}
            </button>

            {status.type !== "idle" && (
              <div className={`p-4 border font-mono text-[10px] leading-tight ${
                status.type === "success" 
                  ? "bg-gray-50 border-gray-900 text-gray-900" 
                  : "bg-red-50 border-red-200 text-red-800"
              } animate-in fade-in slide-in-from-top-1 duration-300`}>
                <div className="flex items-start gap-3">
                  {status.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{status.message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
