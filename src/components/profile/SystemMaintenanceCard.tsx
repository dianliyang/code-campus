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
            message: `Synchronization complete: ${result.count} records updated.` 
          });
        } else {
          setStatus({ 
            type: "error", 
            message: result.error || "Failed to synchronize." 
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
          <h3 className="text-lg font-semibold text-gray-900">System Maintenance</h3>
          <p className="text-sm text-gray-500">Manual operations and data synchronization tools.</p>
        </header>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 p-6 rounded-lg border border-gray-100 bg-white max-w-3xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
              <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin text-blue-600" : ""}`} />
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-900 mb-0.5">University Sport Sync</span>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[320px]">
                Manually trigger the CAU Sport scraper to update the latest course catalog.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={handleRunScraper}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 min-w-[140px] justify-center h-9"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Scraper
                </>
              )}
            </button>

            {status.type !== "idle" && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-medium ${
                status.type === "success" 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
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
    </div>
  );
}
