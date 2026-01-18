"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export default function Pagination({ totalPages, currentPage }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2);

  return (
    <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
      <button 
        onClick={() => updatePage(Math.max(1, currentPage - 1))} 
        disabled={currentPage === 1} 
        className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
      >
        <i className="fa-solid fa-chevron-left text-xs"></i>
      </button>

      {pages.map((p, i, arr) => (
        <div key={p} className="flex items-center">
          {i > 0 && p - arr[i - 1] > 1 && <span className="px-3 text-gray-300">...</span>}
          <button 
            onClick={() => updatePage(p)} 
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-xs font-black transition-all ${
              currentPage === p 
                ? "bg-brand-blue text-white border border-brand-blue" 
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400 transition-colors"
            }`}
          >
            {p}
          </button>
        </div>
      ))}

      <button 
        onClick={() => updatePage(Math.min(totalPages, currentPage + 1))} 
        disabled={currentPage === totalPages} 
        className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
      >
        <i className="fa-solid fa-chevron-right text-xs"></i>
      </button>
    </div>
  );
}
