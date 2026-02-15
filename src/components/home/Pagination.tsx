"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE_OPTIONS = [12, 24, 48];

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  totalItems?: number;
  perPage?: number;
}

export default function Pagination({ totalPages, currentPage, totalItems, perPage = 12 }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updatePage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`, { scroll: true });
  }, [searchParams, router]);

  const updatePerPage = useCallback((newPerPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", newPerPage.toString());
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: true });
  }, [searchParams, router]);

  const pages = useMemo(() =>
    Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2),
    [totalPages, currentPage]
  );

  const showingStart = totalItems && perPage ? (currentPage - 1) * perPage + 1 : undefined;
  const showingEnd = totalItems && perPage ? Math.min(currentPage * perPage, totalItems) : undefined;

  return (
    <div className="flex flex-col items-center gap-4 mt-12">
      <div className="flex items-center gap-3">
        {totalItems !== undefined && showingStart !== undefined && showingEnd !== undefined && (
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {showingStart}-{showingEnd} of {totalItems}
          </span>
        )}
        <select
          value={perPage}
          onChange={(e) => updatePerPage(Number(e.target.value))}
          className="h-8 px-2 pr-6 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer hover:border-gray-400 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-blue"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
        >
          {PER_PAGE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt} / page</option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
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
      )}
    </div>
  );
}
