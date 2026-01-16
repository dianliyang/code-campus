"use client";

import Link from "next/link";
import Image from "next/image";
import FloatingNavWrapper from "./FloatingNavWrapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LandingNavbar({ dict }: { dict: any }) {
  return (
    <FloatingNavWrapper initialClassName="w-full bg-transparent translate-y-0 border-b border-transparent">
      {(scrolled) => (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center transition-all duration-500 ${scrolled ? 'h-14' : 'h-24'}`}>
            
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="group flex items-center gap-4">
                <Image 
                  src="/code-campus-logo.svg" 
                  alt="CodeCampus" 
                  width={scrolled ? 32 : 40} 
                  height={scrolled ? 32 : 40} 
                  className={`transition-all duration-500 group-hover:-rotate-6 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'}`}
                />
                {!scrolled && (
                  <div className="flex flex-col transition-opacity duration-300">
                    <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">CodeCampus</span>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] group-hover:text-brand-blue transition-colors">{dict?.global_network || "Global Network"}</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Navigation Links */}
            <div className={`hidden md:flex items-center transition-all duration-500 ${
              scrolled 
                ? 'gap-4 bg-transparent' 
                : 'gap-8 bg-white/80 backdrop-blur-md px-8 py-3 rounded-full border border-gray-100 shadow-sm'
            }`}>
              {[
                { name: dict?.mission || "Mission", href: "#mission", icon: "fa-solid fa-shuttle-space" },
                { name: dict?.universities || "Universities", href: "#universities", icon: "fa-solid fa-building-columns" },
                { name: dict?.curriculum || "Curriculum", href: "#features", icon: "fa-solid fa-layer-group" }
              ].map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  className={`group relative flex items-center justify-center transition-all duration-300 ${
                    scrolled 
                      ? 'w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 hover:text-brand-blue' 
                      : 'px-4 py-2 gap-3'
                  }`}
                  title={scrolled ? item.name : undefined}
                >
                  <i className={`${item.icon} text-sm transition-transform group-hover:scale-110 ${!scrolled && 'text-gray-400 group-hover:text-brand-blue'}`}></i>
                  
                  {!scrolled && (
                    <>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-gray-900 transition-colors">
                        {item.name}
                      </span>
                    </>
                  )}
                </Link>
              ))}
            </div>

            {/* CTA Section */}
            <div className="flex items-center gap-6">
              <Link 
                href="/courses" 
                className={`flex items-center justify-center btn-primary group transition-all duration-500 ${
                   scrolled ? 'w-10 h-10 rounded-full !px-0 !py-0' : 'gap-4 px-6 py-3'
                }`}
              >
                {scrolled ? (
                  <i className="fa-solid fa-arrow-right text-sm"></i>
                ) : (
                  <>
                    {dict?.enter || "Enter"}
                    <i className="fa-solid fa-arrow-right-long transition-transform group-hover:translate-x-1"></i>
                  </>
                )}
              </Link>
            </div>

          </div>
        </div>
      )}
    </FloatingNavWrapper>
  );
}
