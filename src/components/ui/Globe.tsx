"use client";

import { useEffect, useRef, useState } from "react";

interface GlobeProps {
  className?: string;
  size?: number;
}

export default function Globe({ className = "" }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Handle Retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const globeRadius = (width < height ? width : height) * 0.45;
    const dotRadius = 1.2;
    
    // Generate Fibonacci sphere points - Higher density for Magic UI look
    const samples = 900; 
    const phi = Math.PI * (3 - Math.sqrt(5));

    const points: { x: number; y: number; z: number; originalX: number; originalY: number; originalZ: number }[] = [];
    
    for (let i = 0; i < samples; i++) {
      const y = 1 - (i / (samples - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      points.push({ x, y, z, originalX: x, originalY: y, originalZ: z });
    }

    let animationFrameId: number;
    let currentRotation = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update rotation with inertia
      currentRotation += 0.001; // Constant slow spin
      
      // Mouse interaction blending
      // For now, let's keep it simple auto-rotation + tilt
      const rx = 0.3; // Fixed tilt
      const ry = currentRotation;

      const cx = width / 2;
      const cy = height / 2;

      // Sort points by Z depth for correct rendering order
      // (Actually for simple dots opacity is enough, but sorting is safer for dense clouds)
      
      points.forEach((point) => {
        // Rotate around Y
        let x = point.originalX * Math.cos(ry) - point.originalZ * Math.sin(ry);
        let z = point.originalX * Math.sin(ry) + point.originalZ * Math.cos(ry);
        let y = point.originalY;

        // Rotate around X (Tilt)
        const y_tilted = y * Math.cos(rx) - z * Math.sin(rx);
        const z_tilted = y * Math.sin(rx) + z * Math.cos(rx);
        
        x = x;
        y = y_tilted;
        z = z_tilted;

        // Perspective
        const px = cx + x * globeRadius;
        const py = cy + y * globeRadius;

        // Render
        // Magic UI style: 
        // - Front dots: Bright, solid color
        // - Back dots: Very faint or hidden
        // - Color: Usually white or primary brand color
        
        if (z > 0) {
            // Front face
            const depthAlpha = z; // 0 to 1
            const sizeMod = (z + 1) * 0.5; // Slightly larger in front
            
            ctx.beginPath();
            ctx.arc(px, py, dotRadius * sizeMod, 0, Math.PI * 2);
            // Mix of white and brand blue
            ctx.fillStyle = `rgba(100, 150, 255, ${0.6 + depthAlpha * 0.4})`; 
            ctx.fill();
            
            // Add a "glow" to some random dots or just the brightest ones?
            // Magic UI often has a soft bloom. Canvas shadowBlur is expensive.
            // Let's fake it by drawing a larger faint circle behind the very front ones
            if (z > 0.9) {
                 ctx.beginPath();
                 ctx.arc(px, py, dotRadius * 4, 0, Math.PI * 2);
                 ctx.fillStyle = `rgba(59, 130, 246, 0.15)`;
                 ctx.fill();
            }

        } else {
            // Back face - faint ghost structure
            const depthAlpha = (z + 1) * 0.1; // Very faint
            ctx.beginPath();
            ctx.arc(px, py, dotRadius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100, 150, 255, ${Math.max(0.05, depthAlpha)})`;
            ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: '100%', height: '100%' }}>
       <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-90 mix-blend-screen"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      {/* Radial Gradient overlay for that 'faded edge' look */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(17,24,39,0.5)_100%)]"></div>
    </div>
  );
}