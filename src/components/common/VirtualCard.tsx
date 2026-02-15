"use client";

import { useState, useEffect, useRef, ReactNode } from "react";

interface VirtualCardProps {
  children: ReactNode;
  id: string | number;
  initialHeight?: string;
  className?: string;
}

export default function VirtualCard({ 
  children, 
  id, 
  initialHeight = "60px",
  className = ""
}: VirtualCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = containerRef.current;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // If we have a measured height, we can safely hide the children
          if (currentRef && currentRef.offsetHeight > 0) {
            setHeight(currentRef.offsetHeight);
          }
          setIsVisible(false);
        }
      },
      {
        rootMargin: "600px 0px", // Increase margin for smoother loading
        threshold: 0,
      }
    );

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0 && isVisible) {
          setHeight(entry.target.getBoundingClientRect().height);
        }
      }
    });

    if (currentRef) {
      observer.observe(currentRef);
      resizeObserver.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
        resizeObserver.unobserve(currentRef);
      }
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [isVisible]);

  return (
    <div 
      ref={containerRef} 
      data-id={id}
      className={className}
      style={{ 
        minHeight: height ? `${height}px` : initialHeight,
        // Use content-visibility if supported, or fallback to simple toggle
        contentVisibility: isVisible ? "auto" : "hidden",
        containIntrinsicSize: height ? `auto ${height}px` : `auto ${initialHeight}`,
        // Ensure it behaves as a block in list and respects grid settings
        display: "block",
        width: "100%",
        height: height ? `${height}px` : "auto"
      }}
    >
      {isVisible ? children : <div style={{ height: height || initialHeight, width: "100%" }} />}
    </div>
  );
}
