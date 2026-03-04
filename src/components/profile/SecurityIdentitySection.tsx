"use client";

import { ShieldCheck, Mail, Fingerprint, Trash2, AlertTriangle } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";import { Card } from "@/components/ui/card";

interface SecurityIdentitySectionProps {
  view: "identity" | "account";
  provider?: string;
}

export default function SecurityIdentitySection({
  view,
  provider
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
          toast.error("Purge sequence failed. System error.", { position: "bottom-right" });
        }
      } catch {
        toast.error("Fatal error during account deletion.", { position: "bottom-right" });
      }
    });
  };

  return (
    <div>
      {/* Identity & Security view */}
      {view === "identity" &&
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Identity */}
          <Card>
            <Card>
              <Fingerprint className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Active Identity</span>
            </Card>

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
          </Card>

          {/* Communication */}
          <Card>
            <Card>
              <Mail className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Communication</span>
            </Card>

            <div className="space-y-4">
              <p className="text-xs text-[#666] leading-relaxed">
                System notifications and security alerts are dispatched via your authentication provider&apos;s endpoint.
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#777]">Alerts</span>
                <span className="text-xs font-medium text-emerald-700 px-2 py-0.5 bg-emerald-50 border border-emerald-100">Active</span>
              </div>
            </div>
          </Card>
        </div>
      }

      {/* Account / Danger Zone view */}
      {view === "account" &&
      <Card>
          <Card>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">Danger Zone</span>
          </Card>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-red-700">Delete Account</h4>
              <p className="text-xs text-red-800/70 leading-relaxed max-w-xl">
                This will permanently purge your profile, enrollment history, and scheduling data. This operation is irreversible.
              </p>
            </div>

            <Button variant="outline"
          onClick={handleDeleteAccount}
          disabled={isPending}>

            
              <Trash2 />
              Purge Account
            </Button>
          </div>
        </Card>
      }
    </div>);

}