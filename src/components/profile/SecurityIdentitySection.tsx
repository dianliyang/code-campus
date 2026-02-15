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
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <Fingerprint className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight">Active Identity</span>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Provider</span>
              <span className="text-sm font-bold text-gray-900">{provider || "Unknown"}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <Mail className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight">Communication</span>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-500 leading-relaxed">
              System notifications and security alerts are dispatched via your authentication provider&apos;s endpoint.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 uppercase">Alerts</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2 py-0.5 bg-emerald-50 rounded-full">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-bold tracking-tight">Termination Zone</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-red-600">Delete Account</h4>
            <p className="text-xs text-red-800/60 leading-relaxed max-w-xl">
              This will permanently purge your profile, enrollment history, and scheduling data. This operation is irreversible.
            </p>
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-6 h-10 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            Purge Account
          </button>
        </div>
      </div>
    </div>
  );
}
