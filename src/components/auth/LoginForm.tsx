"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface LoginFormProps {
  onMagicLink: (formData: FormData) => Promise<void>;
}

export default function LoginForm({ onMagicLink }: LoginFormProps) {
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
      // Keep loading state true if successful to prevent re-submission while redirecting
      // or show a success message state (not implemented here, keeping it simple)
      setLoading(false); 
    }
  }

  return (
    <div className="max-w-md w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">System Authentication</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Connect to the academic node</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
            {error === "OAuthAccountNotLinked"
              ? "This email is linked to another provider. Please use your social login."
              : error === "AccessDenied"
              ? "Access denied. Your account may be restricted."
              : error === "Configuration"
              ? "System configuration error. Please check environment variables."
              : `Authentication error: ${error}. Please try again.`}
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
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-blue text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Sending Magic Link..." : "Send Magic Link"}
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