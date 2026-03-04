"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectsSeminarsPaginationProps {
  page: number;
  perPage: number;
  totalPages: number;
}

export default function ProjectsSeminarsPagination({
  page,
  perPage,
  totalPages,
}: ProjectsSeminarsPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageNumbers = Array.from(
    new Set([1, page - 1, page, page + 1, totalPages]),
  )
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const createPageHref = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    return `/projects-seminars?${next.toString()}`;
  };

  return (
    <>
      <div className="hidden md:flex flex-nowrap items-center justify-between gap-2 rounded-md border px-2 py-2">
        <p className="text-xs text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </p>
        <div className="flex flex-nowrap items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={(value) => {
              const next = new URLSearchParams(searchParams.toString());
              next.set("perPage", value);
              next.set("page", "1");
              router.push(`/projects-seminars?${next.toString()}`, { scroll: false });
            }}
          >
            <SelectTrigger id="select-rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="48">48</SelectItem>
            </SelectContent>
          </Select>
          <Pagination className="mx-0 w-auto shrink-0">
            <PaginationContent className="gap-0.5">
              <PaginationItem>
                <PaginationPrevious href={createPageHref(Math.max(1, page - 1))} />
              </PaginationItem>
              {pageNumbers.map((p, i) => (
                <PaginationItem key={p}>
                  {i > 0 && p - pageNumbers[i - 1] > 1 ? (
                    <PaginationEllipsis />
                  ) : null}
                  <PaginationLink
                    href={createPageHref(p)}
                    isActive={p === page}
                    size="sm"
                    className="h-8 min-w-8 px-2"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext href={createPageHref(Math.min(totalPages, page + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      <div className="md:hidden border-t pt-3">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={createPageHref(Math.max(1, page - 1))} />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href={createPageHref(Math.min(totalPages, page + 1))} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </>
  );
}
