"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function Hero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Initialize from URL
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  
  // Track the last pushed query to avoid redundant navigations
  const lastPushedQuery = useRef(initialQuery);

  // 1. Sync local state with URL (e.g. browser back button)
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(urlQuery);
      lastPushedQuery.current = urlQuery;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    <div className="bg-brand-dark text-white py-12 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none hidden lg:block">
        <div className="text-8xl font-black italic tracking-tighter">INIT_0xFC</div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-end mb-6">
          <h1 className="text-3xl md:text-4xl font-black mb-0 tracking-tight uppercase">Git Push Your Career.</h1>
        </div>

        <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl flex items-center font-mono text-sm md:text-base focus-within:border-brand-blue transition-all">
          <span className="text-brand-green mr-3">user@codecampus:~$</span>
          <input
            type="text"
            placeholder="Search by course name, code (e.g. CS106), or topic (e.g. Machine Learning)"
            className="bg-transparent border-none outline-none text-gray-300 w-full placeholder-gray-600 focus:ring-0 caret-brand-green"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-xs font-mono text-gray-400 flex-wrap">
          <span className="mr-1">Try searching:</span>
          {["AI", "Systems", "Algorithms", "Computer Vision"].map((tag) => (
            <span 
              key={tag} 
              className={`bg-gray-800 px-2 py-1 rounded cursor-pointer hover:text-white transition-colors ${query === tag ? 'text-brand-blue border border-brand-blue/30' : 'text-gray-400'}`}
              onClick={() => handleSuggestion(tag)}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}