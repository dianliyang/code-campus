"use client";

import { useState, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { getUniversityLogoUrl, getUniversityLogoBase } from "@/lib/supabase/storage";

interface UniversityIconProps {
  name: string;
  size?: number;
  className?: string;
}

const EXTENSIONS = ['.webp', '.png', '.jpg', '.jpeg', '.svg'] as const;

function getInitials(str: string) {
  if (str === str.toUpperCase() && str.length <= 4) return str;
  const words = str.split(' ').filter(w => w.length > 0);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default memo(function UniversityIcon({ name, size = 40, className = "" }: UniversityIconProps) {
  const [error, setError] = useState(false);
  const [extIndex, setExtIndex] = useState(0);
  const [knownFailed, setKnownFailed] = useState(false);
  const [prevName, setPrevName] = useState(name);

  if (name !== prevName) {
    setPrevName(name);
    setError(false);
    setExtIndex(0);
    setKnownFailed(false);
  }

  // Use known logo URL directly (no probing needed), fall back to extension probing
  const knownUrl = useMemo(() => getUniversityLogoUrl(name), [name]);

  const currentSrc = useMemo(() => {
    if (knownUrl && !knownFailed) return knownUrl;
    const baseLogoUrl = getUniversityLogoBase(name);
    return `${baseLogoUrl}${EXTENSIONS[extIndex]}`;
  }, [knownUrl, knownFailed, name, extIndex]);

  const handleError = useCallback(() => {
    if (knownUrl && !knownFailed) {
      // Known URL failed once (e.g. extension changed). Start probing.
      setKnownFailed(true);
      setExtIndex(0);
    } else if (extIndex < EXTENSIONS.length - 1) {
      setExtIndex(prev => prev + 1);
    } else {
      setError(true);
    }
  }, [knownUrl, knownFailed, extIndex]);

  if (error) {
    return (
      <div
        className={`bg-gray-100 text-gray-500 font-black flex items-center justify-center uppercase select-none rounded ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.35) }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded ${className}`} style={{ width: size, height: size }}>
      <Image
        key={currentSrc}
        src={currentSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        sizes={`${size}px`}
        onError={handleError}
      />
    </div>
  );
});
