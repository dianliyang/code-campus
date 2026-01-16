"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccount() {
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
          <i className="fa-solid fa-triangle-exclamation"></i>
          <p className="text-sm font-bold uppercase tracking-wider">Dangerous Action</p>
        </div>
        <p className="text-sm text-red-500">
          This will permanently delete your profile and all course progress. This cannot be undone.
        </p>
        <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-500 text-white btn-base px-6 py-2 rounded-xl hover:bg-red-600 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm Deletion"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="bg-white text-gray-500 border border-gray-200 btn-base px-6 py-2 rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center text-2xl">
        <i className="fa-solid fa-user-slash"></i>
      </div>
      <div>
        <h4 className="text-lg font-bold text-gray-900">Deactivate Account</h4>
        <p className="text-sm text-gray-500 leading-relaxed mt-1">
          Permanently remove your account and erase all study data from the CodeCampus system.
        </p>
        <button 
          onClick={() => setIsConfirming(true)}
          className="mt-4 flex items-center gap-2 px-3 py-1.5 -ml-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all group cursor-pointer"
        >
          <span className="text-xs font-bold uppercase tracking-widest">Delete My Account</span>
        </button>
      </div>
    </div>
  );
}
