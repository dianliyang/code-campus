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
    <div className="space-y-16 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Active Identity */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <Fingerprint className="w-5 h-5" />
            <span className="text-sm font-bold italic uppercase tracking-tighter">IDENTITY_AUTH_SOURCE</span>
          </div>

          <div className="p-6 border-2 border-black bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auth_Provider</span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-900">{provider || "Unknown"}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Security_Level</span>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <Mail className="w-5 h-5" />
            <span className="text-sm font-bold italic uppercase tracking-tighter">COMM_CHANNELS</span>
          </div>

          <div className="p-6 border-2 border-black bg-white">
            <p className="text-[10px] text-gray-400 font-mono uppercase leading-relaxed">
              Your primary communication endpoint is managed through your authentication provider. All system notifications are dispatched to this channel.
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-900 uppercase">Status</span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase italic">ACTIVE_LISTENING</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-12 border-t-2 border-dashed border-red-100">
        <div className="flex items-center gap-3 text-red-600 mb-8">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-bold italic uppercase tracking-tighter text-red-600">TERMINATION_ZONE</span>
        </div>

        <div className="max-w-xl p-8 border-2 border-red-600 bg-red-50/30 space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest">ACCOUNT_PURGE_SEQUENCE</h4>
            <p className="text-[10px] font-mono text-red-800 leading-relaxed uppercase">
              Executing this operation will permanently delete your profile, study plans, and historical logs. This action cannot be reversed once initialized.
            </p>
          </div>

          <button
            onClick={handleDeleteAccount}
            disabled={isPending}
            className="flex items-center justify-center gap-3 px-6 h-11 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            <Trash2 className="w-4 h-4" />
            INITIALIZE_PURGE
          </button>
        </div>
      </div>
    </div>
  );
}
