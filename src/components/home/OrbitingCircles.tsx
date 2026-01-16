"use client";

import { useEffect, useRef } from "react";

export default function OrbitingCircles() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Orbits - More Visible */}
      <div className="absolute w-[40%] h-[40%] border border-slate-200 rounded-full opacity-40"></div>
      <div className="absolute w-[70%] h-[70%] border border-slate-200 rounded-full opacity-25"></div>
      <div className="absolute w-[100%] h-[100%] border border-slate-200 rounded-full opacity-15"></div>

      {/* Center Core */}
      <div className="absolute w-12 h-12 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center z-10">
        <div className="w-3 h-3 bg-brand-blue rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
      </div>

      {/* Orbiting Nodes - Ring 1 */}
      <div className="absolute w-[40%] h-[40%] animate-spin-slow">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-red-100 rounded-full shadow-lg flex items-center justify-center">
           <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-blue-100 rounded-full shadow-lg flex items-center justify-center">
           <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
        </div>
      </div>

      {/* Orbiting Nodes - Ring 2 (Reverse) */}
      <div className="absolute w-[70%] h-[70%] animate-spin-reverse-slower">
        <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-9 h-9 bg-white border border-amber-100 rounded-full shadow-xl flex items-center justify-center">
           <i className="fa-solid fa-graduation-cap text-amber-500 text-[11px]"></i>
        </div>
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-9 h-9 bg-white border border-indigo-100 rounded-full shadow-xl flex items-center justify-center">
           <i className="fa-solid fa-code text-indigo-500 text-[11px]"></i>
        </div>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-9 h-9 bg-white border border-emerald-100 rounded-full shadow-xl flex items-center justify-center">
           <i className="fa-solid fa-database text-emerald-500 text-[11px]"></i>
        </div>
      </div>
    </div>
  );
}
