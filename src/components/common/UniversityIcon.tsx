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
const resolvedLogoSrcCache = new Map<string, string>();
const knownUrlFailedCache = new Set<string>();
const allLogoFailedCache = new Set<string>();

function getInitials(str: string) {
  if (str === str.toUpperCase() && str.length <= 4) return str;
  const words = str.split(' ').filter(w => w.length > 0);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default memo(function UniversityIcon({ name, size = 40, className = "" }: UniversityIconProps) {
  const [state, setState] = useState(() => ({
    name,
    error: allLogoFailedCache.has(name),
    extIndex: 0,
    knownFailed: knownUrlFailedCache.has(name),
  }));

  const initialState = useMemo(() => ({
    name,
    error: allLogoFailedCache.has(name),
    extIndex: 0,
    knownFailed: knownUrlFailedCache.has(name),
  }), [name]);

  const effectiveState = state.name === name ? state : initialState;
  const { error, extIndex, knownFailed } = effectiveState;

  // Use known logo URL directly (no probing needed), fall back to extension probing
  const knownUrl = useMemo(() => getUniversityLogoUrl(name), [name]);
  const cachedResolvedSrc = resolvedLogoSrcCache.get(name);

  const currentSrc = useMemo(() => {
    if (cachedResolvedSrc) return cachedResolvedSrc;
    if (knownUrl && !knownFailed) return knownUrl;
    const baseLogoUrl = getUniversityLogoBase(name);
    return `${baseLogoUrl}${EXTENSIONS[extIndex]}`;
  }, [cachedResolvedSrc, knownUrl, knownFailed, name, extIndex]);

  const handleLoad = useCallback(() => {
    resolvedLogoSrcCache.set(name, currentSrc);
    allLogoFailedCache.delete(name);
  }, [name, currentSrc]);

  const handleError = useCallback(() => {
    if (cachedResolvedSrc) {
      resolvedLogoSrcCache.delete(name);
    }

    if (knownUrl && !knownFailed && currentSrc === knownUrl) {
      // Known URL failed once (e.g. extension changed). Start probing.
      knownUrlFailedCache.add(name);
      setState((prev) => {
        const base = prev.name === name ? prev : initialState;
        return { ...base, knownFailed: true, extIndex: 0 };
      });
    } else if (extIndex < EXTENSIONS.length - 1) {
      setState((prev) => {
        const base = prev.name === name ? prev : initialState;
        return { ...base, extIndex: base.extIndex + 1 };
      });
    } else {
      allLogoFailedCache.add(name);
      setState((prev) => {
        const base = prev.name === name ? prev : initialState;
        return { ...base, error: true };
      });
    }
  }, [cachedResolvedSrc, name, knownUrl, knownFailed, currentSrc, extIndex, initialState]);

  if (error) {
    return (
      <div
        className={`bg-gray-100 text-gray-500 font-black flex items-center justify-center uppercase select-none rounded shrink-0 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size, fontSize: Math.max(8, size * 0.35) }}
        title={name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <Image
        src={currentSrc}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="object-contain w-full h-full"
        sizes={`${size}px`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});
