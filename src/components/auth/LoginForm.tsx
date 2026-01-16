"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface LoginFormProps {
  onMagicLink: (formData: FormData) => Promise<void>;
  sent?: boolean;
}

export default function LoginForm({ onMagicLink, sent }: LoginFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    
    try {
      await onMagicLink(formData);
    } catch (e) {
      console.error("Login submission error:", e);
    } finally {
      setLoading(false); 
    }
  }

  return (
    <div className="max-w-md w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">System Authentication</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Connect to the academic node</p>
      </div>

      {sent && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl">
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Success</p>
          <p className="text-xs text-green-700 font-medium leading-relaxed">
            Magic link dispatched successfully. Please verify your inbox.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Authentication Failure</p>
          <p className="text-xs text-red-700 font-medium leading-relaxed">
            {error === "OAuthAccountNotLinked"
              ? "This email is linked to another provider."
              : error === "AccessDenied"
              ? "Access denied. Your account may be restricted."
              : error === "Configuration"
              ? "System configuration error."
              : `Error: ${error}. Please verify your identity vector.`}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Identity Vector (Email)
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
          {loading ? "Processing..." : sent ? "Resend Magic Link" : "Send Magic Link"}
        </button>
      </form>

      <div className="mt-12 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          Protected by the CodeCampus Security Protocol. <br />
          Authorized Access Only.
        </p>
      </div>
    </div>
  );
}