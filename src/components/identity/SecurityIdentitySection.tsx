"use client";

import Image from "next/image";
import { AlertTriangle, Fingerprint, Github, Mail, ShieldCheck, Trash2, ExternalLink } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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
      <div className="flex flex-wrap items-stretch gap-4 w-full">
        {/* Core Identity */}
        <Card className="flex flex-col min-w-[300px] flex-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Core Identity</CardTitle>
            </div>
            <CardDescription>
              Primary authentication anchor.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-bold">Provider</p>
                <p className="text-sm font-medium">{normalizeProvider(provider)}</p>
              </div>
              <div className="size-8 rounded-md bg-white border shadow-sm flex items-center justify-center">
                {provider === "github" ? <Github className="size-4" /> : <Mail className="size-4" />}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
              <div className="space-y-0.5">
                <p className="text-[10px] text-emerald-700/70 font-bold">Status</p>
                <p className="text-sm font-semibold text-emerald-700">Verified Access</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* GitHub Integration */}
        <Card className="flex flex-col min-w-[340px] flex-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Developer Node</CardTitle>
            </div>
            <CardDescription>
              Connected GitHub developer profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto flex-1">
            {githubProfile ? (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border-2 border-white shadow-md bg-muted">
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
                    <p className="truncate text-xs text-muted-foreground font-mono">@{githubProfile.login}</p>
                  </div>
                </div>
                
                {githubProfile.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
                    &quot;{githubProfile.bio}&quot;
                  </p>
                )}

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Synced {new Date(githubProfile.updated_at).toLocaleDateString()}</span>
                  {githubProfile.profile_url && (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-brand-blue">
                      <a href={githubProfile.profile_url} target="_blank" rel="noreferrer">
                        View Profile <ExternalLink className="ml-1 size-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
                <div className="size-10 rounded-full bg-slate-50 flex items-center justify-center border border-dashed">
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

        {/* System Communication */}
        <Card className="flex flex-col min-w-[300px] flex-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <CardTitle>System Logic</CardTitle>
            </div>
            <CardDescription>
              Notification and alert routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Critical system alerts and security protocols are dispatched to your primary anchor.
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
              <span className="text-[10px] font-bold text-stone-500">Alert State</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
    <Card className="w-full border-rose-100 bg-rose-50/5 overflow-hidden">
      <div className="flex flex-col md:flex-row items-stretch">
        <div className="p-6 flex-1">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <CardTitle className="text-lg">Danger Zone</CardTitle>
          </div>
          <CardDescription className="mb-6">
            Systems operations that involve permanent data destruction.
          </CardDescription>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50/30">
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-950">System Purge</p>
                <p className="text-xs text-rose-900/70 leading-relaxed">
                  Purging your account will immediately delete all enrolled courses, study plans, cognitive fingerprints, and usage history. 
                  <span className="block mt-1 font-bold">This operation is final and irreversible.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-rose-50/30 border-t md:border-t-0 md:border-l border-rose-100 p-6 flex flex-col justify-center items-center gap-4 min-w-[240px]">
          <p className="text-[10px] font-bold text-rose-900/50">Authorized Access Only</p>
          <Button 
            variant="outline" 
            onClick={handleDeleteAccount} 
            disabled={isPending}
            className="w-full border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-300 font-bold h-12 shadow-sm"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purge Account
          </Button>
        </div>
      </div>
    </Card>
  );
}
