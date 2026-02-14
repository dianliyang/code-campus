"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, UserX } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DeleteAccount({ dict }: { dict?: any }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to delete account:", e);
    } finally {
      setLoading(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-4 p-6 border border-red-100 bg-red-50 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-sm font-bold uppercase tracking-wider">{dict?.delete_confirm_title || "Dangerous Action"}</p>
        </div>
        <p className="text-sm text-red-500">
          {dict?.delete_confirm_desc || "This will permanently delete your profile and all course progress. This cannot be undone."}
        </p>
        <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {loading ? "..." : (dict?.delete_confirm_btn || "Confirm Deletion")}
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="bg-white text-gray-500 border border-gray-200 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
                >
                  {dict?.delete_cancel_btn || "Cancel"}
                </button>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setIsConfirming(true)}
      className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all group"
    >
      <UserX className="w-4 h-4" />
      {dict?.delete_btn || "Purge Profile"}
    </button>
  );
}