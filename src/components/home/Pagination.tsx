"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  totalItems?: number;
  perPage?: number;
}

export default function Pagination({ totalPages, currentPage, totalItems, perPage }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updatePage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  }, [searchParams, router]);

  const pages = useMemo(() =>
    Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2),
    [totalPages, currentPage]
  );

  if (totalPages <= 1) return null;

  const showingStart = totalItems && perPage ? (currentPage - 1) * perPage + 1 : undefined;
  const showingEnd = totalItems && perPage ? Math.min(currentPage * perPage, totalItems) : undefined;

  return (
    <div className="flex flex-col items-center gap-4 mt-12">
      {totalItems !== undefined && showingStart !== undefined && showingEnd !== undefined && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {showingStart}-{showingEnd} of {totalItems}
        </span>
      )}
      <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => updatePage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
      >
        <ChevronLeft className="w-3 h-3" />
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
        <ChevronRight className="w-3 h-3" />
      </button>
      </div>
    </div>
  );
}
