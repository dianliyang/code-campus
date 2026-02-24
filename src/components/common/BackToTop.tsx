"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const scroller = document.getElementById("dashboard-scroll");

    const toggleVisibility = () => {
      const offset = scroller ? scroller.scrollTop : window.pageYOffset;
      setIsVisible(offset > 500);
    };

    if (scroller) {
      scroller.addEventListener("scroll", toggleVisibility);
    } else {
      window.addEventListener("scroll", toggleVisibility);
    }

    return () => {
      if (scroller) {
        scroller.removeEventListener("scroll", toggleVisibility);
      } else {
        window.removeEventListener("scroll", toggleVisibility);
      }
    };
  }, []);

  const scrollToTop = () => {
    const scroller = document.getElementById("dashboard-scroll");
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-40 md:right-8 md:bottom-8">
      <button
        onClick={scrollToTop}
        className="flex items-center justify-center w-11 h-11 bg-white text-brand-blue rounded-full shadow-xl active:scale-90 transition-all border border-gray-200 hover:bg-gray-50 group"
        aria-label="Back to top"
      >
        <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}
