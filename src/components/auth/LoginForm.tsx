"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface LoginFormProps {
  onLogin: (formData: FormData) => Promise<void>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;

    if (password) {
      // Client-side Hashing (SHA-256)
      // This ensures the plain-text password never leaves the client
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      
      formData.set("password", hashHex);
    }

    try {
      await onLogin(formData);
    } catch (e) {
      console.error("Login submission error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md w-full">
      {/* Mobile Logo Only - Visible on small screens */}
      {/* Note: The parent container in page.tsx usually handles layout, 
          but we keep the content structure similar for consistency */}
      
      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">System Authentication</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Connect to the academic node</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">
            {error === "CredentialsSignin"
              ? "Invalid credentials. Please verify your identity vector."
              : error === "OAuthAccountNotLinked"
              ? "This email is linked to another provider. Please use your social login."
              : error === "AccessDenied"
              ? "Access denied. Your account may be restricted."
              : "Authentication failed. System error detected."}
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
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono shadow-inner"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
              Secure Key (Password)
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm focus:border-brand-blue focus:bg-white outline-none transition-all font-mono shadow-inner"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-blue text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-xl hover:bg-blue-700 transition-all shadow-2xl shadow-brand-blue/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Encrypting & Authenticating..." : "Authenticate Session"}
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
