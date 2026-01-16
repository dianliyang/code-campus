"use client";

import { useEffect, useState } from "react";

export default function FloatingNavWrapper({ 
  children, 
  initialClassName = "w-full border-b border-gray-100 bg-white/95 backdrop-blur-md translate-y-0"
}: { 
  children: React.ReactNode,
  initialClassName?: string
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`sticky top-0 z-50 transition-all duration-500 ease-out flex justify-center w-full pointer-events-none ${
      scrolled ? 'pt-4 pb-4' : 'pt-0 pb-0'
    }`}>
      <div className={`transition-all duration-500 ease-out pointer-events-auto ${
        scrolled 
          ? 'w-[92%] max-w-5xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-200/50 bg-white/95 backdrop-blur-2xl translate-y-0' 
          : initialClassName
      }`}>
        {children}
      </div>
    </div>
  );
}
