"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface LoginFormProps {
  onMagicLink: (formData: FormData) => Promise<{ success?: boolean; error?: string } | void>;
  sent?: boolean;
  dict?: any;
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
      setServerError("Default");
    } finally {
      setLoading(false); 
    }
  }

  return (
    <div className="max-w-md w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">{dict?.title || "System Authentication"}</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{dict?.subtitle || "Connect to the academic node"}</p>
      </div>

      {isSent ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-green-50 border border-green-100 rounded-3xl">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-green mb-6 shadow-sm border border-green-100">
              <i className="fa-solid fa-paper-plane text-xl"></i>
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
              {dict?.success_title || "Success"}
            </h2>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              {dict?.success_desc || "Magic link dispatched successfully. Please verify your inbox."}
            </p>
            
            <div className="mt-8 pt-6 border-t border-green-100/50">
               <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">{dict?.security_protocol || "Security Protocol"}</p>
               <p className="text-[11px] text-green-700/70 font-medium italic">
                 {dict?.spam_notice || "If you don't see the email, please check your spam folder."}
               </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => setIsSent(false)}
              className="text-[10px] font-black text-gray-400 hover:text-brand-blue uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left-long text-[8px]"></i>
              {dict?.wrong_email || "Wrong email?"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">{dict?.error_title || "Authentication Failure"}</p>
              <p className="text-xs text-red-700 font-medium leading-relaxed">
                {error === "OAuthAccountNotLinked"
                  ? (dict?.error_oauth || "This email is linked to another provider.")
                  : error === "AccessDenied"
                  ? (dict?.error_denied || "Access denied. Your account may be restricted.")
                  : error === "Configuration"
                  ? (dict?.error_config || "System configuration error.")
                  : `${dict?.error_default || "Error"}: ${error}.`}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  {dict?.email_label || "Identity Vector (Email)"}
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  defaultValue={searchParams.get("email") || ""}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (dict?.submit_loading || "Processing...") : (dict?.submit_send || "Send Magic Link")}
            </button>
          </form>
        </>
      )}

      <div className="mt-12 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          {dict?.footer || "Protected by Security Protocol."}
        </p>
      </div>
    </div>
  );
}