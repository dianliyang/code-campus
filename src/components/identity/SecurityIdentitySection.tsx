"use client";

import Image from "next/image";
import { AlertTriangle, ExternalLink, Fingerprint, Github, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SecurityIdentitySectionProps {
  view: "identity" | "account";
  provider?: string;
  githubProfile?: {
    provider: string;
    login: string | null;
    name: string | null;
    profile_url: string | null;
    avatar_url: string | null;
    bio?: string | null;
    company?: string | null;
    updated_at: string;
  } | null;
}

function normalizeProvider(provider?: string): string {
  const value = (provider || "").trim();
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SecurityIdentitySection({
  view,
  provider,
  githubProfile = null,
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

  const handleConnectGitHub = () => {
    startTransition(async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const redirectTo = `${window.location.origin}/auth/callback?next=/identity`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo,
            scopes: "read:user",
          },
        });

        if (error) {
          toast.error("GitHub connect failed.", { position: "bottom-right" });
        }
      } catch {
        toast.error("GitHub connect failed.", { position: "bottom-right" });
      }
    });
  };

  if (view === "identity") {
    return (
      <div className="flex w-full flex-wrap items-stretch gap-4">
        <Card className="flex min-w-[300px] flex-1 flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Core Identity</CardTitle>
            </div>
            <CardDescription>Primary authentication anchor.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground">Provider</p>
                <p className="text-sm font-medium">{normalizeProvider(provider)}</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                {provider === "github" ? <Github className="size-4 text-foreground" /> : <Mail className="size-4 text-foreground" />}
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold">Verified Access</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-w-[340px] flex-1 flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Developer Node</CardTitle>
            </div>
            <CardDescription>Connected GitHub developer profile.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex-1">
            {githubProfile ? (
              <div className="flex h-full flex-col justify-between space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-muted shadow-md">
                    {githubProfile.avatar_url ? (
                      <Image
                        src={githubProfile.avatar_url}
                        alt="Avatar"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400">
                        <Github className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {githubProfile.name || githubProfile.login}
                    </p>
                    <p className="truncate text-xs font-mono text-muted-foreground">@{githubProfile.login}</p>
                  </div>
                </div>

                {githubProfile.bio ? (
                  <p className="line-clamp-2 text-xs italic leading-relaxed text-muted-foreground">
                    &quot;{githubProfile.bio}&quot;
                  </p>
                ) : null}

                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-[10px] text-muted-foreground">
                    Synced {new Date(githubProfile.updated_at).toLocaleDateString()}
                  </span>
                  {githubProfile.profile_url ? (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-brand-blue">
                      <a href={githubProfile.profile_url} target="_blank" rel="noreferrer">
                        View Profile <ExternalLink className="ml-1 size-3" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                <div className="flex size-10 items-center justify-center rounded-full border border-dashed bg-slate-50">
                  <Github className="size-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-stone-600">No developer node linked.</p>
                  <p className="text-[10px] text-muted-foreground">Connect GitHub to enable developer workflows.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectGitHub}
                  disabled={isPending}
                  className="w-full"
                >
                  Connect GitHub
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-w-[300px] flex-1 flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle>System Logic</CardTitle>
            </div>
            <CardDescription>Notification and alert routing.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Critical system alerts and security protocols are dispatched to your primary anchor.
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold text-stone-500">Alert State</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold text-emerald-700">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </div>
          <CardDescription className="mb-6">
            Systems operations that involve permanent data destruction.
          </CardDescription>

          <div className="space-y-1">
            <p className="text-sm font-bold text-rose-950">System Purge</p>
            <p className="text-xs leading-relaxed text-rose-900/70">
              Purging your account will immediately delete all enrolled courses, study plans, cognitive fingerprints, and usage history.
              <span className="mt-1 block font-bold">This operation is final and irreversible.</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleDeleteAccount}
            disabled={isPending}
            className="w-full font-bold text-rose-600 hover:bg-rose-600 hover:text-white sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Account
          </Button>
        </div>
      </div>
    </Card>
  );
}
