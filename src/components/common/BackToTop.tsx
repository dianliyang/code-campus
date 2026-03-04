"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button variant="outline" size="icon"
        onClick={scrollToTop}
       
        aria-label="Back to top"
      >
        <ChevronUp className="group-hover:-translate-y-0.5 transition-transform" />
      </Button>
    </div>
  );
}
