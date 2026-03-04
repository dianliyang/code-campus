"use client";

import { AlertTriangle, Fingerprint, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface SecurityIdentitySectionProps {
  view: "identity" | "account";
  provider?: string;
}

function normalizeProvider(provider?: string): string {
  const value = (provider || "").trim();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
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
          return;
        }
        toast.error("Purge sequence failed. System error.", { position: "bottom-right" });
      } catch {
        toast.error("Fatal error during account deletion.", { position: "bottom-right" });
      }
    });
  };

  if (view === "identity") {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Active Identity</CardTitle>
            </div>
            <CardDescription>
              Authentication and verification status for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Provider</span>
              <span className="text-sm font-medium">{normalizeProvider(provider)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                Verified
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Communication</CardTitle>
            </div>
            <CardDescription>
              Notification routing for security and account events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              System notifications and security alerts are dispatched through your authentication
              provider endpoint.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alerts</span>
              <Badge variant="secondary">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle>Danger Zone</CardTitle>
        </div>
        <CardDescription>
          Irreversible account operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-destructive">Delete Account</h4>
          <p className="max-w-xl text-sm text-muted-foreground">
            This will permanently purge your profile, enrollment history, and scheduling data.
            This operation is irreversible.
          </p>
        </div>
        <Button variant="outline" onClick={handleDeleteAccount} disabled={isPending}>
          <Trash2 />
          Purge Account
        </Button>
      </CardContent>
    </Card>
  );
}
