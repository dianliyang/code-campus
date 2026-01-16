"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-gray-950">
      {/* Dynamic Spotlight */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`
        }}
      />

      {/* Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Floating Data Fragments */}
      {[
        { top: '15%', left: '10%', text: 'CS50', delay: '0s' },
        { top: '25%', right: '15%', text: 'MIT 6.001', delay: '2s' },
        { bottom: '20%', left: '20%', text: 'Dijkstra', delay: '4s' },
        { top: '40%', left: '50%', text: 'O(n log n)', delay: '1s', blur: true },
      ].map((item, i) => (
        <div 
          key={i}
          className={`absolute glass-card px-4 py-2 rounded-lg text-xs font-mono text-brand-blue/50 animate-[float-random_10s_ease-in-out_infinite] ${item.blur ? 'blur-sm opacity-30' : 'opacity-60'}`}
          style={{ 
            top: item.top, 
            left: item.left, 
            right: item.right, 
            bottom: item.bottom,
            animationDelay: item.delay 
          }}
        >
          {item.text}
        </div>
      ))}
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] opacity-10"></div>
    </div>
  );
}
