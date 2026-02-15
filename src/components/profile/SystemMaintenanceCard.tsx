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
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h3 className="text-sm font-semibold text-gray-900">System Operations</h3>
        <p className="text-xs text-gray-500 mt-1">Execute manual data synchronization and system maintenance tasks.</p>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-lg border border-gray-100 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
            <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-gray-900 mb-0.5">CAU Sport Sync</span>
            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[320px]">
              Manually trigger the scraper to fetch the latest sports courses from the university servers.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <button
            onClick={handleRunScraper}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 min-w-[140px] justify-center h-10"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Scraper
              </>
            )}
          </button>

          {status.type !== "idle" && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-semibold ${
              status.type === "success" 
                ? "bg-green-50 text-green-700 border border-green-100" 
                : "bg-red-50 text-red-700 border border-red-100"
            } animate-in fade-in duration-300`}>
              {status.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
