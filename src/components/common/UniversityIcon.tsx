"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getUniversityLogoBase } from "@/lib/supabase/storage";

interface UniversityIconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function UniversityIcon({ name, size = 40, className = "" }: UniversityIconProps) {
  const [error, setError] = useState(false);
  const [extIndex, setExtIndex] = useState(0);
  const extensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  
  const baseLogoUrl = getUniversityLogoBase(name);
  const currentSrc = `${baseLogoUrl}${extensions[extIndex]}`;

  const handleError = () => {
    if (extIndex < extensions.length - 1) {
      setExtIndex(prev => prev + 1);
    } else {
      setError(true);
    }
  };

  // Reset state when name changes
  useEffect(() => {
    setError(false);
    setExtIndex(0);
  }, [name]);

  // Generate initials for fallback
  const getInitials = (str: string) => {
    if (str === str.toUpperCase() && str.length <= 4) return str;
    const words = str.split(' ').filter(w => w.length > 0);
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  if (error) {
    return (
      <div 
        className={`bg-gray-100 text-gray-500 font-black flex items-center justify-center uppercase select-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.35) }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        key={currentSrc} // Force re-render on src change
        src={currentSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        onError={handleError}
        unoptimized // Optional: helps with external image changing rapidly, but not strictly required
      />
    </div>
  );
}
