"use client";

import { useState, useEffect, useRef, ReactNode } from "react";

interface VirtualCardProps {
  children: ReactNode;
  id: string | number;
  initialHeight?: string;
}

export default function VirtualCard({ children, id, initialHeight = "60px" }: VirtualCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When it becomes visible, render the content
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          // When it goes out of view, we save the current height to prevent jump
          // and then we can "unmount" the content if it's far enough
          // For simplicity, we unmount whenever it's not intersecting
          if (containerRef.current) {
            setHeight(containerRef.current.offsetHeight);
          }
          setIsVisible(false);
        }
      },
      {
        rootMargin: "600px 0px", // Pre-render 600px before it enters/leaves
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef} 
      data-id={id}
      style={{ 
        minHeight: height ? `${height}px` : initialHeight,
        contain: "paint layout" 
      }}
    >
      {isVisible ? children : null}
    </div>
  );
}
