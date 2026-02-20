"use client";

import { useEffect, useState } from "react";

export default function FloatingNavWrapper({ 
  children, 
  initialClassName = "w-full border-b border-gray-100 bg-white/95 backdrop-blur-md"
}: { 
  children: (scrolled: boolean) => React.ReactNode,
  initialClassName?: string
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full pointer-events-none">
      <div
        className={`pointer-events-auto w-full transition-[transform,background-color,border-color,box-shadow,border-radius,backdrop-filter,padding] duration-300 ease-out ${
          scrolled
            ? "max-w-5xl mt-3 rounded-2xl border border-black/10 bg-white/85 backdrop-blur-xl shadow-[0_10px_34px_rgba(0,0,0,0.08)] px-2 sm:px-4"
            : `${initialClassName} rounded-none px-0`
        }`}
      >
        {children(scrolled)}
      </div>
    </div>
  );
}
