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
    <div className="mt-0 flex flex-col gap-2 rounded-lg bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-[12px] text-[#707070]">
        {totalItems !== undefined && showingStart !== undefined && showingEnd !== undefined ? (
          <span>
            {showingStart}-{showingEnd} of {totalItems}
          </span>
        ) : null}
        <span className="text-[#b5b5b5]">|</span>
        <label className="inline-flex items-center gap-1.5">
          <span>Rows</span>
          <select
            value={perPage}
            onChange={(e) => updatePerPage(Number(e.target.value))}
            className="h-7 rounded-md border border-[#d8d8d8] bg-white px-2 pr-6 text-[12px] text-[#4f4f4f] appearance-none cursor-pointer hover:border-[#c3c3c3] focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
          >
            {PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => updatePage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-7 w-7 flex items-center justify-center border border-[#d8d8d8] rounded-md bg-white text-[#5f5f5f] hover:bg-[#f8f8f8] disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {pages.map((p, i, arr) => (
            <div key={p} className="flex items-center">
              {i > 0 && p - arr[i - 1] > 1 ? <span className="px-1.5 text-[#b2b2b2]">...</span> : null}
              <button
                onClick={() => updatePage(p)}
                className={`h-7 min-w-7 px-2 flex items-center justify-center rounded-md text-[12px] font-medium transition-colors ${
                  currentPage === p
                    ? "bg-[#efefef] text-[#252525] border border-[#d6d6d6]"
                    : "bg-white text-[#666] border border-[#d8d8d8] hover:bg-[#f8f8f8]"
                }`}
              >
                {p}
              </button>
            </div>
          ))}

          <button
            onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-7 w-7 flex items-center justify-center border border-[#d8d8d8] rounded-md bg-white text-[#5f5f5f] hover:bg-[#f8f8f8] disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
