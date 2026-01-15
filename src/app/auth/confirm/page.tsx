"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Globe from "@/components/ui/Globe";
import { Suspense, useState, useEffect } from "react";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = searchParams.get("t");
    if (t) {
      try {
        // Decode the base64 URL
        const decoded = atob(t);
        setTargetUrl(decoded);
      } catch (e) {
        console.error("Failed to decode token", e);
        setError(true);
      }
    } else {
      setError(true);
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="max-w-md w-full text-center lg:text-left">
        <h1 className="text-2xl font-black text-red-600 uppercase mb-4">Invalid Link</h1>
        <p className="text-gray-500 mb-8 font-medium">This verification link is malformed or has expired.</p>
        <Link href="/login" className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs inline-block">
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full text-center lg:text-left">
      <div className="lg:hidden flex justify-center mb-12">
        <Image src="/code-campus-logo.svg" alt="CodeCampus" width={64} height={64} className="w-16 h-16" />
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">Final Verification</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
          Confirm your identity to establish the secure session.
        </p>
      </div>

      <div className="space-y-8">
        <p className="text-gray-500 font-medium leading-relaxed">
          To prevent automated access and protect your identity, please click the button below to complete the authentication process.
        </p>

        <button 
          onClick={() => {
            if (targetUrl) window.location.href = targetUrl;
          }}
          disabled={!targetUrl}
          className="w-full lg:w-auto bg-brand-blue text-white font-black text-xs uppercase tracking-[0.2em] px-12 py-5 rounded-xl hover:bg-blue-700 transition-all shadow-2xl shadow-brand-blue/30 active:scale-[0.98] inline-block text-center disabled:opacity-50"
        >
          Confirm and Sign In
        </button>
      </div>

      <div className="mt-12">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          Protected by the CodeCampus Security Protocol. <br />
          Authorized Access Only.
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      <div className="hidden lg:flex flex-col justify-between bg-gray-950 p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none">
          <div className="text-[10rem] font-black italic tracking-tighter">0xFC</div>
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image src="/code-campus-logo.svg" alt="CodeCampus" width={48} height={48} className="w-12 h-12 brightness-200" />
            <div className="flex flex-col -space-y-1.5">
              <span className="text-2xl font-black tracking-tighter text-white uppercase">CodeCampus</span>
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.3em]">Global Network</span>
            </div>
          </Link>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="w-[120%] h-[120%]">
             <Globe />
           </div>
        </div>
        <div className="relative z-10 max-w-md">
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-6 leading-none">
             Access <br /> <span className="text-brand-blue">Confirmation</span>.
           </h2>
           <p className="text-gray-400 font-medium leading-relaxed">
             Human verification required. Secure your terminal and proceed to the academic catalog.
           </p>
        </div>
        <div className="relative z-10">
           <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">
             © 2026 CodeCampus Global Network.
           </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 sm:p-12 md:p-16">
        <Suspense fallback={<div>Loading verification context...</div>}>
          <ConfirmContent />
        </Suspense>
      </div>
    </div>
  );
}