"use client";

import { useState, useTransition } from "react";
import { runManualSportScraper } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function SystemMaintenanceCard() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });

  const handleRunScraper = () => {
    setStatus({ type: "idle" });
    startTransition(async () => {
      try {
        const result = await runManualSportScraper();
        if (result.success) {
          setStatus({ 
            type: "success", 
            message: `Successfully updated ${result.count} sport courses.` 
          });
        } else {
          setStatus({ 
            type: "error", 
            message: result.error || "Failed to run scraper." 
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 rounded-2xl bg-gray-50/50 border border-gray-100 transition-all hover:bg-gray-50">
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center shadow-sm">
          <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
        </div>
        <div>
          <span className="block text-sm font-bold text-gray-900 mb-1">CAU Sport Synchronization</span>
          <p className="text-[10px] text-gray-500 leading-relaxed max-w-[400px]">
            Trigger the manual scraper to fetch the latest course data from the university servers.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-3">
        <button
          onClick={handleRunScraper}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 min-w-[140px] justify-center"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              Run Scraper
            </>
          )}
        </button>

        {status.type !== "idle" && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${
            status.type === "success" 
              ? "bg-green-50 text-green-700 border border-green-100" 
              : "bg-red-50 text-red-700 border border-red-100"
          } animate-in fade-in`}>
            {status.type === "success" ? (
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
            )}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
