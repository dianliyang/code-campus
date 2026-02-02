"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Hero({ dict }: { dict?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize from URL
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);

  // Track the last pushed query to avoid redundant navigations
  const lastPushedQuery = useRef(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Sync local state with URL (e.g. browser back button)
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
      lastPushedQuery.current = urlQuery;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // 2. Debounced URL update
  useEffect(() => {
    // If the local state already matches the last thing we pushed (or the URL), skip
    if (query === lastPushedQuery.current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (query) params.set("q", query);
      else params.delete("q");
      
      params.set("page", "1");
      
      const newUrl = `/courses?${params.toString()}`;
      lastPushedQuery.current = query;
      // Avoid scroll jump if already on courses page
      router.push(newUrl, { scroll: pathname !== '/courses' });
    }, 500);

    return () => clearTimeout(timer);
  }, [query, router, searchParams, pathname]);

  const handleSuggestion = (tag: string) => {
    setQuery(tag);
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200 py-16 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
              <Search className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
              {dict?.search?.label || "Course Registry Search"}
            </h1>
          </div>

          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-8">
            {dict?.search?.title ? (
              dict.search.title.includes("learn") ? (
                <>
                  {dict.search.title.split("learn")[0]}
                  <span className="text-brand-blue">learn</span>
                  {dict.search.title.split("learn")[1]}
                </>
              ) : dict.search.title.includes("学") ? (
                <>
                  {dict.search.title.split("学")[0]}
                  <span className="text-brand-blue">学</span>
                  {dict.search.title.split("学")[1]}
                </>
              ) : (
                dict.search.title
              )
            ) : (
              <>
                What do you want to <span className="text-brand-blue">learn</span> today?
              </>
            )}
          </h2>

          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <span className="text-slate-400 font-mono text-sm group-focus-within:text-brand-blue transition-colors">/</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder={dict?.search?.placeholder || "Search by course name, code, or university..."}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-20 py-5 text-lg font-medium text-slate-900 placeholder:text-slate-300 outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 font-sans text-[10px] font-bold text-slate-400">
                <span className="text-xs">⌘</span> K
              </kbd>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 flex-wrap">
            <span className="mr-2 opacity-60">{dict?.search?.popular || "Popular Nodes"}:</span>
            {["AI", "Systems", "Algorithms", "ML"].map((tag) => (
              <button 
                key={tag} 
                className={`px-3 py-1 rounded-full border transition-all ${
                  query === tag 
                    ? 'bg-brand-blue text-white border-brand-blue' 
                    : 'bg-white border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => handleSuggestion(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}