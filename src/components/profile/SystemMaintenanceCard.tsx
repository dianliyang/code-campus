"use client";

import { useState, useTransition } from "react";
import { runManualSportScraper } from "@/actions/scrapers";
import { Loader2, Play, CheckCircle2, AlertCircle, RefreshCw, Server } from "lucide-react";

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
    <section id="maintenance" className="bg-white border border-gray-200 rounded-3xl overflow-hidden mt-8">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar Label */}
        <aside className="w-full md:w-72 bg-gray-50 border-r border-gray-100 p-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-3 mb-4">System Ops</h3>
          <div className="px-3 py-4 rounded-2xl bg-white border border-gray-100">
            <div className="flex items-center gap-3 text-brand-blue mb-2">
              <Server className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-tight">Maintenance</span>
            </div>
            <p className="text-[10px] font-medium text-gray-400 leading-relaxed">
              Execute manual system tasks and data synchronization triggers.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-grow p-8 md:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
              </div>
              <div>
                <span className="block text-sm font-black uppercase tracking-tight text-gray-900 leading-none mb-1">CAU Sport Sync</span>
                <p className="text-[10px] font-medium text-gray-400 leading-relaxed max-w-[300px]">
                  Manually trigger the scraper to fetch and update the latest sports courses from the CAU server.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleRunScraper}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Scraper
                  </>
                )}
              </button>
            </div>
          </div>

          {status.type !== "idle" && (
            <div className={`mt-4 flex items-center gap-3 p-3 rounded-xl border ${
              status.type === "success" 
                ? "bg-green-50 border-green-100 text-green-700" 
                : "bg-red-50 border-red-100 text-red-700"
            } animate-in fade-in slide-in-from-top-2`}>
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wide">
                {status.message}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
