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
    const s = searchParams.get("s");
    if (s) {
      try {
        const decoded = atob(s);
        setTargetUrl(decoded);
      } catch (e) {
        console.error("Shield decode failed", e);
        setError(true);
      }
    } else {
      setError(true);
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="max-w-md w-full text-center lg:text-left">
        <h1 className="text-2xl font-black text-red-600 uppercase mb-4">Verification Fault</h1>
        <p className="text-gray-500 mb-8 font-medium italic">"The secure link was not recognized by the network."</p>
        <Link href="/login" className="bg-black text-white px-10 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] inline-block active:scale-95 transition-all">
          ← Return to node
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
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">Authorize Session</h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
          Identity confirmation required for node access.
        </p>
      </div>

      <div className="space-y-8">
        <p className="text-gray-500 font-medium leading-relaxed">
          Please confirm your intention to enter the CodeCampus Network. This action will establish a secure, authenticated session.
        </p>

        <button 
          onClick={() => {
            if (targetUrl) window.location.href = targetUrl;
          }}
          disabled={!targetUrl}
          className="w-full lg:w-auto bg-brand-blue text-white font-black text-[10px] uppercase tracking-[0.3em] px-12 py-5 rounded-xl hover:bg-blue-700 transition-all shadow-2xl shadow-brand-blue/30 active:scale-[0.98] inline-block text-center disabled:opacity-50"
        >
          Confirm Authentication
        </button>
      </div>

      <div className="mt-12">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
          Authenticated via Resend Security Protocol. <br />
          System Version 1.0.4 // 0xFC
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
             Identity <br /> <span className="text-brand-blue">Authorization</span>.
           </h2>
           <p className="text-gray-400 font-medium leading-relaxed">
             The final step in your authentication journey. Securely verifying your connection to the catalog.
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
