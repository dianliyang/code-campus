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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Identity */}
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 space-y-4">
          <div className="flex items-center gap-2 text-[#222] mb-3 pb-3 border-b border-[#efefef]">
            <Fingerprint className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Active Identity</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#777]">Provider</span>
              <span className="text-sm font-medium text-[#222]">{provider || "Unknown"}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#777]">Status</span>
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-medium">Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 space-y-4">
          <div className="flex items-center gap-2 text-[#222] mb-3 pb-3 border-b border-[#efefef]">
            <Mail className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Communication</span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[#666] leading-relaxed">
              System notifications and security alerts are dispatched via your authentication provider&apos;s endpoint.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#777]">Alerts</span>
              <span className="text-xs font-medium text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/30 border border-red-100 rounded-md p-4 space-y-4">
        <div className="flex items-center gap-2 text-red-700 pb-3 border-b border-red-100">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-semibold">Danger Zone</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-red-700">Delete Account</h4>
            <p className="text-xs text-red-800/70 leading-relaxed max-w-xl">
              This will permanently purge your profile, enrollment history, and scheduling data. This operation is irreversible.
            </p>
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 h-8 rounded-md border border-red-300 bg-white px-3 text-[13px] font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Account
          </button>
        </div>
      </div>
    </div>
  );
}
