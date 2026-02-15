"use client";

import { ShieldCheck, Mail, Fingerprint, Trash2, AlertTriangle } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface SecurityIdentitySectionProps {
  provider?: string;
}

export default function SecurityIdentitySection({
  provider,
}: SecurityIdentitySectionProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDeleteAccount = () => {
    if (!confirm("CRITICAL_OPERATION: Are you absolutely sure? All data will be permanently purged.")) return;
    
    startTransition(async () => {
      try {
        const res = await fetch("/api/user/delete", { method: "DELETE" });
        if (res.ok) {
          router.push("/login");
        } else {
          alert("Purge sequence failed. System error.");
        }
      } catch {
        alert("Fatal error during account deletion.");
      }
    });
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Identity */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 text-gray-900 mb-2 border-b border-gray-50 pb-4">
            <Fingerprint className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Active Identity</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provider</span>
              <span className="text-[11px] font-black text-gray-900 uppercase tracking-tighter">{provider || "Unknown"}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3 text-gray-900 mb-2 border-b border-gray-50 pb-4">
            <Mail className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Communication</span>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium italic">
              System notifications and security alerts are dispatched via your authentication provider&apos;s endpoint.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Alerts</span>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100/50">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Termination Zone</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest">Delete Account</h4>
            <p className="text-[10px] text-red-800/60 leading-relaxed max-w-xl font-bold italic uppercase">
              This will permanently purge your profile, enrollment history, and scheduling data. This operation is irreversible.
            </p>
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-6 h-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 whitespace-nowrap shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Account
          </button>
        </div>
      </div>
    </div>
  );
}
