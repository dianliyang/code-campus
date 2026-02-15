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
            message: `SUCCESS: ${result.count} RECORDS_SYNCED` 
          });
        } else {
          setStatus({ 
            type: "error", 
            message: result.error || "ERR_SYNC_FAILED" 
          });
        }
      } catch (error) {
        setStatus({ 
          type: "error", 
          message: error instanceof Error ? error.message : "ERR_UNEXPECTED" 
        });
      }
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] italic">SYSTEM_OPERATIONS</span>
        <h3 className="text-xl font-black text-gray-950 uppercase tracking-tighter italic mt-2">Maintenance_Console</h3>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 p-8 border border-gray-100 bg-white">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
            <RefreshCw className={`w-6 h-6 ${isPending ? "animate-spin text-brand-blue" : ""}`} />
          </div>
          <div>
            <span className="block text-[11px] font-black uppercase tracking-widest text-gray-950 mb-1">CAU_SPORT_SCRAPER_v1.0</span>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed max-w-[350px]">
              Execute manual synchronization with university sport vectors. This action will bypass the automated cron schedule.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <button
            onClick={handleRunScraper}
            disabled={isPending}
            className="flex items-center gap-3 px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-blue transition-all disabled:opacity-50 min-w-[180px] justify-center h-12"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                SYNCING...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                EXEC_SCRAPER
              </>
            )}
          </button>

          {status.type !== "idle" && (
            <div className={`flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] border ${
              status.type === "success" 
                ? "bg-brand-green/10 text-brand-green border-brand-green/20" 
                : "bg-red-50 text-red-700 border-red-100"
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
