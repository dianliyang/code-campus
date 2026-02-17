"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingNavWrapper from "./FloatingNavWrapper";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LandingNavbar({ dict }: { dict: any }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const enterText = isLoggedIn ? (dict?.dashboard_btn || "Dashboard") : (dict?.enter || "Browse");

  const navItems = [
    { name: dict?.mission || "About", href: "#mission" },
    { name: dict?.universities || "Schools", href: "#universities" },
    { name: dict?.curriculum || "Features", href: "#features" },
  ];

  return (
    <FloatingNavWrapper initialClassName="w-full bg-transparent translate-y-0 border-b border-transparent">
      {(scrolled) => (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-500 ${scrolled ? 'h-14' : 'h-20 md:h-24'}`}>

            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="group flex items-center gap-2 md:gap-3">
                <Image
                  src="/code-campus-logo.svg"
                  alt="CodeCampus"
                  width={scrolled ? 28 : 36}
                  height={scrolled ? 28 : 36}
                  priority
                  className={`transition-all duration-500 group-hover:-rotate-6 ${scrolled ? 'w-7 h-7' : 'w-9 h-9 md:w-10 md:h-10'}`}
                />
                <span className={`text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-none transition-all duration-500 ${scrolled ? 'text-base' : ''}`}>
                  CodeCampus
                </span>
              </Link>
            </div>

            {/* Nav Links (Desktop) */}
            {!scrolled && (
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors rounded-full"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}

            {/* CTA */}
            <div className="flex items-center">
              {scrolled ? (
                <Link
                  href="/courses"
                  className="w-9 h-9 rounded-full bg-slate-900 text-white shadow-xl hover:bg-brand-blue transition-all duration-300 flex items-center justify-center"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Button size="sm" className="rounded-full gap-2" asChild>
                  <Link href="/courses">
                    {enterText}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              )}
            </div>

          </div>
        </div>
      )}
    </FloatingNavWrapper>
  );
}
