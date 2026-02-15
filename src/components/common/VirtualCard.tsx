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
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          if (containerRef.current && containerRef.current.offsetHeight > 0) {
            setHeight(containerRef.current.offsetHeight);
          }
          setIsVisible(false);
        }
      },
      {
        rootMargin: "400px 0px",
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

    if (containerRef.current) {
      observer.observe(containerRef.current);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [isVisible]);

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
