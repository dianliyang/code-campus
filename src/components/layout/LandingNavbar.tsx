"use client";

import Link from "next/link";
import Image from "next/image";
import FloatingNavWrapper from "./FloatingNavWrapper";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LandingNavbar({ dict }: { dict: any }) {
  const ctaText = dict?.enter_network || "Browse Courses";

  const navItems = [
    { name: dict?.mission || "About", href: "#mission" },
    { name: dict?.universities || "Schools", href: "#universities" },
    { name: dict?.curriculum || "Features", href: "#features" },
  ];

  return (
    <FloatingNavWrapper initialClassName="w-full bg-white/95 border-b border-slate-200 backdrop-blur-md">
      {(scrolled) => (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-[height,padding] duration-300 ${scrolled ? "h-12" : "h-14 md:h-16"}`}>

            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="group flex items-center gap-2 md:gap-3">
                <Image
                  src="/code-campus-logo-bw.svg"
                  alt="CodeCampus"
                  width={scrolled ? 28 : 36}
                  height={scrolled ? 28 : 36}
                  priority
                  className={`transition-[transform,width,height] duration-300 ${scrolled ? "w-7 h-7 scale-95" : "w-9 h-9 md:w-10 md:h-10 scale-100"} group-hover:scale-105`}
                />
                <span className={`text-lg md:text-xl font-bold tracking-tight text-slate-900 leading-none transition-[font-size,opacity,transform] duration-300 ${scrolled ? "text-base" : ""}`}>
                  CodeCampus
                </span>
              </Link>
            </div>

            {/* Nav Links (Desktop) */}
            <nav
              className={`hidden lg:flex items-center gap-1 transition-[opacity,transform] duration-200 ${
                scrolled ? "opacity-0 -translate-y-1 pointer-events-none" : "opacity-100 translate-y-0"
              }`}
            >
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

            {/* CTA */}
            <div className="flex items-center">
              <Button
                size="sm"
                className={`rounded-full border border-black/15 bg-white text-slate-900 hover:bg-slate-900 hover:text-white transition-[padding,box-shadow,background-color,color] duration-300 ${
                  scrolled ? "px-3 h-8 shadow-none" : "px-4 h-9 shadow-sm"
                }`}
                asChild
              >
                <Link href="/courses" className="group inline-flex items-center justify-center gap-1.5">
                  <span className="whitespace-nowrap text-xs font-semibold tracking-wide uppercase">
                    {ctaText}
                  </span>
                  <ArrowRight className={`shrink-0 transition-transform duration-300 ${scrolled ? "w-3 h-3" : "w-3.5 h-3.5"} group-hover:translate-x-0.5`} />
                </Link>
              </Button>
            </div>

          </div>
        </div>
      )}
    </FloatingNavWrapper>
  );
}
