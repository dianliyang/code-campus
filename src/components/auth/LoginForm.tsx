"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { Send, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  onMagicLink: (formData: FormData) => Promise<{ success?: boolean; error?: string } | void>;
  sent?: boolean;
  dict: Dictionary['dashboard']['login'];
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
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-gray-50 border border-gray-100 rounded-2xl">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-green-600 mb-6 shadow-sm border border-gray-100">
            <Send className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {dict?.success_title || "Check your email"}
          </h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            {dict?.success_desc || "We've sent a magic link to your inbox. Please click the link to sign in."}
          </p>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
             <p className="text-xs font-medium text-slate-500 mb-1">{dict?.security_protocol || "Security Protocol"}</p>
             <p className="text-xs text-gray-500 italic">
               {dict?.spam_notice || "If you don't see the email, please check your spam folder."}
             </p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => setIsSent(false)}
            className="text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-3 h-3" />
            {dict?.wrong_email || "Use a different email"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">{dict?.title || "Sign In"}</h1>
        <p className="text-sm font-medium text-gray-500">{dict?.subtitle || "Connect to the CodeCampus node"}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-600 mb-1">{dict?.error_title || "Authentication Failure"}</p>
            <p className="text-xs text-red-700 font-medium leading-relaxed">
              {error === "OAuthAccountNotLinked"
                ? (dict?.error_oauth || "This email is linked to another provider.")
                : error === "AccessDenied"
                ? (dict?.error_denied || "Access denied. Your account may be restricted.")
                : error === "Configuration"
                ? (dict?.error_config || "System configuration error.")
                : error === "Verification"
                ? (dict?.error_verification || "The sign-in link is no longer valid.")
                : `${dict?.error_default || "Error"}: ${error}.`}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-600 ml-1">
            {dict?.email_label || "Email Address"}
          </label>
          <input
            type="email"
            name="email"
            placeholder="name@example.com"
            defaultValue={searchParams.get("email") || ""}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-gray-900 focus:ring-0 outline-none transition-all"
            required
          />
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (dict?.submit_send || "Send Magic Link")}
        </Button>
      </form>

      <div className="mt-12 text-center">
        <p className="text-xs text-slate-400 leading-relaxed">
          {dict?.footer || "Secure access via Supabase Auth"}
        </p>
      </div>
    </div>
  );
}
