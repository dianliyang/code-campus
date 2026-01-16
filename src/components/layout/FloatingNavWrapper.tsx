"use client";

import { useEffect, useState } from "react";

export default function FloatingNavWrapper({ 
  children, 
  initialClassName = "w-full border-b border-gray-100 bg-white/95 backdrop-blur-md translate-y-0"
}: { 
  children: (scrolled: boolean) => React.ReactNode,
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
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out flex justify-center w-full pointer-events-none ${
      scrolled ? 'pt-4 pb-4' : 'pt-0 pb-0'
    }`}>
      <div className={`transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] pointer-events-auto w-fit ${
        scrolled 
          ? 'min-w-[380px] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 bg-gray-950/80 backdrop-blur-2xl translate-y-0 px-6' 
          : `${initialClassName} min-w-full rounded-none px-0`
      }`}>
        {children(scrolled)}
      </div>
    </div>
  );
}
