"use client";

import { useState, useTransition } from "react";
import { runManualScraperAction } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, Database } from "lucide-react";

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
  const [selectedUni, setSelectedUni] = useState(UNIVERSITIES[4].id); // Default to CAU
  const [selectedSem, setSelectedSem] = useState(SEMESTERS[2].id); // Default to sp26
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  const handleRunScraper = () => {
    setStatus({ type: "idle" });
    startTransition(async () => {
      try {
        const result = await runManualScraperAction({
            university: selectedUni,
            semester: selectedSem
        });
        
        if (result.success) {
          setStatus({ 
            type: "success", 
            message: `Success: ${result.count} records processed for ${selectedUni.toUpperCase()} (${selectedSem}).` 
          });
        } else {
          setStatus({ 
            type: "error", 
            message: result.error || "Operation failed." 
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
    <div className="space-y-12 animate-in fade-in duration-300">
      <div className="space-y-6">
        <header>
          <h3 className="text-lg font-semibold text-gray-900 italic tracking-tight">SYSTEM_MAINTENANCE</h3>
          <p className="text-sm text-gray-500 font-mono">Manual data synchronization and catalog updates.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl p-8 border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Target Institution</label>
              <select 
                value={selectedUni}
                onChange={(e) => setSelectedUni(e.target.value)}
                disabled={isPending}
                className="w-full h-11 px-4 bg-gray-50 border-2 border-black text-sm font-bold focus:outline-none focus:bg-white transition-colors disabled:opacity-50 appearance-none"
                style={{ borderRadius: 0 }}
              >
                {UNIVERSITIES.map(uni => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Target Semester</label>
              <select 
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value)}
                disabled={isPending}
                className="w-full h-11 px-4 bg-gray-50 border-2 border-black text-sm font-bold focus:outline-none focus:bg-white transition-colors disabled:opacity-50 appearance-none"
                style={{ borderRadius: 0 }}
              >
                {SEMESTERS.map(sem => (
                  <option key={sem.id} value={sem.id}>{sem.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col justify-between border-l-0 md:border-l-2 md:border-black md:pl-8 pt-6 md:pt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-900">
                <Database className="w-5 h-5" />
                <span className="text-sm font-bold italic">SCRAPER_CONTROL_UNIT</span>
              </div>
              <p className="text-xs text-gray-500 font-mono leading-relaxed">
                Initiating this process will connect to the university&apos;s external API/HTML catalog and synchronize the local database.
              </p>
            </div>

            <div className="space-y-4 pt-6">
              <button
                onClick={handleRunScraper}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-3 h-12 bg-black text-white text-xs font-bold uppercase tracking-tighter hover:bg-gray-800 transition-all disabled:opacity-50 group"
                style={{ borderRadius: 0 }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Executing_Sequence...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />
                    Initialize_Scrape
                  </>
                )}
              </button>

              {status.type !== "idle" && (
                <div className={`p-4 border-2 font-mono text-[10px] leading-tight ${
                  status.type === "success" 
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                    : "bg-red-50 border-red-500 text-red-800"
                } animate-in slide-in-from-top-2 duration-300`}>
                  <div className="flex items-start gap-3">
                    {status.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
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
      </div>
    </div>
  );
}
