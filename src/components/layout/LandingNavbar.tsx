"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingNavWrapper from "./FloatingNavWrapper";
import NavLinks from "./NavLinks";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LandingNavbar({ dict }: { dict: any }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const enterText = isLoggedIn ? (dict?.dashboard_btn || "Dashboard") : (dict?.enter || "Enter");

  return (
    <FloatingNavWrapper initialClassName="w-full bg-transparent translate-y-0 border-b border-transparent">
      {(scrolled) => (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-500 ${scrolled ? 'h-14' : 'h-20 md:h-24'}`}>
            
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="group flex items-center gap-2 md:gap-4">
                <Image
                  src="/code-campus-logo.svg"
                  alt="CodeCampus"
                  width={scrolled ? 28 : 36}
                  height={scrolled ? 28 : 36}
                  priority
                  className={`transition-all duration-500 group-hover:-rotate-6 ${scrolled ? 'w-7 h-7' : 'w-9 h-9 md:w-10 md:h-10'}`}
                />
                {!scrolled && (
                  <div className="flex flex-col transition-opacity duration-300">
                    <span className="text-lg md:text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">CodeCampus</span>
                    <span className="hidden sm:block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-[0.3em] group-hover:text-brand-blue transition-colors">{dict?.global_network || "Open Catalog"}</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Navigation Links (Desktop Only) */}
            <NavLinks variant="light" collapsed={scrolled} dict={dict} mode="landing" />

            {/* CTA Section */}
            <div className="flex items-center gap-3 md:gap-6">
              <Link 
                href="/courses"
                className={`flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${
                   scrolled 
                    ? 'w-9 h-9 !rounded-full !px-0 !py-0 bg-slate-900 text-white shadow-xl hover:bg-brand-blue' 
                    : 'btn-primary !rounded-full gap-2 md:gap-4 px-4 md:px-6 py-2 md:py-3 shadow-xl shadow-slate-200'
                }`}
              >
                <span className={`transition-all duration-500 overflow-hidden whitespace-nowrap font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] ${
                  scrolled ? 'max-w-0 opacity-0' : 'max-w-[100px] opacity-100'
                }`}>
                  {enterText}
                </span>
                
                <ArrowRight className={`transition-all duration-500 ${
                  scrolled ? 'w-3.5 h-3.5' : 'w-4 h-4 group-hover:translate-x-1'
                }`} />
              </Link>
            </div>

          </div>
        </div>
      )}
    </FloatingNavWrapper>
  );
}
