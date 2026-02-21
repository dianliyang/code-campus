"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

const Dot = () => <span className="text-[0.55rem] leading-none">●</span>;

type Status = "online" | "offline" | "pending" | "syncing" | "failed";

const DB_NAME = "cc-offline-queue";
const STORE   = "sync-queue";

async function getCounts(): Promise<{ pending: number; failed: number }> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME);
      req.onerror = () => resolve({ pending: 0, failed: 0 });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.close();
          return resolve({ pending: 0, failed: 0 });
        }
        const tx = db.transaction(STORE, "readonly");
        const all = tx.objectStore(STORE).getAll();
        all.onsuccess = () => {
          db.close();
          const rows = all.result as Array<{ failed: boolean }>;
          resolve({
            pending: rows.filter((r) => !r.failed).length,
            failed:  rows.filter((r) => r.failed).length,
          });
        };
        all.onerror = () => { db.close(); resolve({ pending: 0, failed: 0 }); };
      };
    } catch {
      resolve({ pending: 0, failed: 0 });
    }
  });
}

export default function OfflineIndicator() {
  const [status, setStatus] = useState<Status>("online");
  const [count,  setCount]  = useState(0);

  useEffect(() => {
    async function refresh() {
      if (!navigator.onLine) {
        const { pending } = await getCounts();
        setStatus(pending > 0 ? "pending" : "offline");
        setCount(pending);
        return;
      }
      const { pending, failed } = await getCounts();
      if (failed  > 0) { setStatus("failed");  setCount(failed);  return; }
      if (pending > 0) { setStatus("pending"); setCount(pending); return; }
      setStatus("online");
    }

    refresh();

    const onOffline = () => { void refresh(); };
    const onOnline  = () => {
      setStatus("syncing");
      navigator.serviceWorker?.controller?.postMessage({ type: "ONLINE" });
    };

    const onMessage = async (e: MessageEvent) => {
      const { type, remaining, pending } = e.data ?? {};
      if (type === "QUEUED")        { setStatus("pending"); setCount(pending); }
      if (type === "SYNC_PROGRESS") { setStatus("syncing"); setCount(remaining); }
      if (type === "SYNC_COMPLETE") { await refresh(); }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online",  onOnline);
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online",  onOnline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  if (status === "online") return null;

  const cfg: Record<Exclude<Status, "online">, { icon: React.ReactNode; label: string; cls: string }> = {
    offline: { icon: <Dot />,                                          label: "Offline",          cls: "bg-[#f0f0f0] text-[#666] border-[#e0e0e0]" },
    pending: { icon: <Dot />,                                          label: `${count} pending`, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    syncing: { icon: <RefreshCw className="w-3 h-3 animate-spin" />,  label: "Syncing…",         cls: "bg-blue-50 text-blue-700 border-blue-200" },
    failed:  { icon: <AlertTriangle className="w-3 h-3" />,           label: `${count} failed`,  cls: "bg-red-50 text-red-700 border-red-200" },
  };

  const { icon, label, cls } = cfg[status];

  return (
    <div className={`fixed bottom-16 right-3 sm:bottom-3 z-50 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm ${cls}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
