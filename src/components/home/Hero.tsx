"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Hero({ dict }: { dict?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Initialize from URL
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  // Track the last pushed query to avoid redundant navigations
  const lastPushedQuery = useRef(initialQuery);
  const inputRef = useRef<HTMLInputElement >(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local state with URL (e.g. browser back button)
  useEffect(() => {
    if (!mounted) return;
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mounted]);

  // Add Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const executeSearch = (searchQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) params.set("q", searchQuery);
    else params.delete("q");
    params.set("page", "1");
    
    const targetPath = pathname === "/workouts" ? "/workouts" : "/courses";
    const newUrl = `${targetPath}?${params.toString()}`;
    
    if (pathname === targetPath) {
      router.replace(newUrl, { scroll: false });
    } else {
      router.push(newUrl);
    }
  };

  const handleSuggestion = (tag: string) => {
    setQuery(tag);
    executeSearch(tag);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement >) => {
    if (e.key === "Enter") {
      executeSearch(query);
    }
  };

  return (
    <div className="py-10 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="text-slate-400 font-mono text-sm group-focus-within:text-brand-blue transition-colors">/</span>
            </div>
            <Input
              ref={inputRef}
              type="text"
              placeholder={dict?.search?.placeholder || "Search by course name, code, or university..."}
             
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 border border-slate-200 bg-slate-50 px-1.5 font-sans text-[9px] font-bold text-slate-400">
                <span className="text-xs">⌘</span> K
              </kbd>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-wrap">
            <span className="mr-1 opacity-60">{dict?.search?.popular || "Popular"}:</span>
            {(pathname === "/workouts"
              ? ["Yoga", "Swimming", "Fitness", "Football"]
              : ["AI", "Systems", "Algorithms", "ML"]
            ).map((tag) => (
              <Button variant="outline" key={tag} type="button" onClick={() => handleSuggestion(tag)}>
                #{tag}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
