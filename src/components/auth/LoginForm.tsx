"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { Send, ArrowLeft, Loader2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  onMagicLink: (formData: FormData) => Promise<{ success?: boolean; error?: string } | void>;
  sent?: boolean;
  dict: Dictionary["dashboard"]["login"];
}

export default function LoginForm({ onMagicLink, sent: initialSent, dict }: LoginFormProps) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(initialSent || false);
  const [serverError, setServerError] = useState<string | null>(null);

  const error = serverError || urlError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setServerError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await onMagicLink(formData);
      if (result && result.success) {
        setIsSent(true);
      } else if (result && result.error) {
        setServerError(result.error);
      }
    } catch (e) {
      console.error("Login submission error:", e);
      setServerError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (isSent) {
    return (
      <div className="border border-stone-200 bg-white p-6" style={{ fontFamily: "var(--font-landing-sans)" }}>
        <div className="mb-4 inline-flex h-9 w-9 items-center justify-center border border-stone-200 bg-stone-50">
          <Send className="h-4 w-4 text-stone-700" />
        </div>
        <h2 className="text-2xl tracking-tight text-stone-900" style={{ fontFamily: "var(--font-landing-serif)" }}>
          {dict?.success_title || "Check your email"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          {dict?.success_desc ||
            "We've sent a magic link to your inbox. Please click the link to sign in."}
        </p>
        <p className="mt-4 text-xs uppercase tracking-widest text-stone-500" style={{ fontFamily: "var(--font-landing-mono)" }}>
          {dict?.spam_notice || "If you don't see the email, please check your spam folder."}
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={() => setIsSent(false)}>
            <ArrowLeft />
            {dict?.wrong_email || "Use a different email"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-stone-200 bg-white p-6" style={{ fontFamily: "var(--font-landing-sans)" }}>
      <div className="mb-6">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "var(--font-landing-mono)" }}>
          Secure Access
        </div>
        <h1 className="text-3xl tracking-tight text-stone-900" style={{ fontFamily: "var(--font-landing-serif)" }}>
          {dict?.title || "Sign In"}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          {dict?.subtitle || "Connect to the Athena workspace"}
        </p>
      </div>

      {error ? (
        <div className="mb-5 flex items-start gap-2 border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {dict?.error_title || "Authentication Failure"}
            </p>
            <p className="text-xs text-red-700/90">
              {error === "OAuthAccountNotLinked"
                ? dict?.error_oauth || "This email is linked to another provider."
                : error === "AccessDenied"
                  ? dict?.error_denied || "Access denied. Your account may be restricted."
                  : error === "Configuration"
                    ? dict?.error_config || "System configuration error."
                    : error === "Verification"
                      ? dict?.error_verification || "The sign-in link is no longer valid."
                      : `${dict?.error_default || "Error"}: ${error}.`}
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-[11px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "var(--font-landing-mono)" }}>
            {dict?.email_label || "Email Address"}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="email"
              name="email"
              placeholder="name@example.com"
              defaultValue={searchParams.get("email") || ""}
              required
              className="h-11 rounded-none border-stone-300 bg-white pl-9 text-stone-900 placeholder:text-stone-400 focus-visible:border-stone-900 focus-visible:ring-0"
            />
          </div>
        </div>

        <Button
          variant="outline"
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-none border-stone-900 bg-stone-900 justify-center text-[11px] uppercase tracking-[0.16em] text-white hover:bg-stone-800 hover:text-white"
          style={{ fontFamily: "var(--font-landing-mono)" }}
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          {loading ? dict?.submit_loading || "Sending..." : dict?.submit_send || "Send Magic Link"}
        </Button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-4">
        <p className="text-[10px] uppercase tracking-widest text-stone-500" style={{ fontFamily: "var(--font-landing-mono)" }}>
          {dict?.footer || "Secure access via Supabase Auth"}
        </p>
      </div>
    </div>
  );
}
