"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ProjectSeminarEnrollButton from "@/components/projects-seminars/ProjectSeminarEnrollButton";
import ProjectsSeminarsDataTable from "@/components/projects-seminars/table/projects-seminars-data-table";
import type { ProjectSeminarTableRow } from "@/components/projects-seminars/table/columns";

type GridItem = {
  id: number;
  title: string;
  course_code: string;
  university: string;
  category: string;
  credit: number | null;
  url: string | null;
  latest_semester: unknown;
  enrolled: boolean;
};

interface ProjectsSeminarsInfiniteContentProps {
  initialRows: ProjectSeminarTableRow[];
  initialGridItems: GridItem[];
  initialPage: number;
  totalPages: number;
  perPage: number;
  view: "list" | "grid";
}

export default function ProjectsSeminarsInfiniteContent({
  initialRows,
  initialGridItems,
  initialPage,
  totalPages,
  perPage,
  view,
}: ProjectsSeminarsInfiniteContentProps) {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<ProjectSeminarTableRow[]>(initialRows);
  const [gridItems, setGridItems] = useState<GridItem[]>(initialGridItems);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRows(initialRows);
    setGridItems(initialGridItems);
    setPage(initialPage);
  }, [initialRows, initialGridItems, initialPage, totalPages, view]);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const effectiveView = isMobileViewport ? "grid" : view;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("perPage");
    return params;
  }, [searchParams]);

  const loadMore = useCallback(async () => {
    if (isLoading || page >= totalPages) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams(baseQuery.toString());
      params.set("page", String(page + 1));
      params.set("size", String(perPage));

      const response = await fetch(`/api/projects-seminars?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load seminars");

      const next = await response.json() as {
        rows?: ProjectSeminarTableRow[];
        items?: GridItem[];
      };

      if (next.rows && next.rows.length > 0) {
        setRows((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const incoming = next.rows!.filter((r) => !seen.has(r.id));
          return [...prev, ...incoming];
        });
      }

      if (next.items && next.items.length > 0) {
        setGridItems((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const incoming = next.items!.filter((r) => !seen.has(r.id));
          return [...prev, ...incoming];
        });
      }

      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("[ProjectsSeminars] Failed to load more", error);
    } finally {
      setIsLoading(false);
    }
  }, [baseQuery, isLoading, page, perPage, totalPages]);

  useEffect(() => {
    if (page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          void loadMore();
        }
      },
      {
        threshold: 0,
        root: scrollContainerRef.current,
        rootMargin: "0px 0px 320px 0px",
      },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isLoading, loadMore, page, totalPages]);

  return (
    <div ref={scrollContainerRef} className="h-full overflow-auto">
      {effectiveView === "list" ? (
        <ProjectsSeminarsDataTable rows={rows} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gridItems.map((item) => {
            const semester = (item.latest_semester || {}) as { term?: string; year?: number };
            const semesterLabel = semester.term && semester.year ? `${semester.term} ${semester.year}` : "-";
            return (
              <Card key={item.id} className="h-full">
                <CardHeader className="min-w-0 flex-1 justify-between">
                  <CardAction>
                    <div className="flex items-center gap-1">
                      <ProjectSeminarEnrollButton
                        projectSeminarId={item.id}
                        initialEnrolled={item.enrolled}
                        iconOnly
                      />
                      {item.url ? (
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open seminar"
                          >
                            <ExternalLink />
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="icon-sm" disabled aria-label="Open seminar unavailable">
                          <ExternalLink />
                        </Button>
                      )}
                    </div>
                  </CardAction>
                    <CardTitle className="line-clamp-2 text-sm">
                      <Link
                        href={`/projects-seminars/${item.id}`}
                        className="transition-colors hover:text-black"
                      >
                        {item.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="col-span-2 mt-auto w-full pt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">{item.course_code} · {item.university}</span>
                      <Badge variant="secondary" className="ml-auto shrink-0">{item.category}</Badge>
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex items-end justify-between text-xs text-slate-600">
                  <span>{semesterLabel}</span>
                  <span>
                    {item.credit != null ? (
                      <>
                        <span className="font-semibold text-foreground">{item.credit}</span> Credits
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <div ref={observerTarget} className="py-4 flex justify-center">
        {isLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : null}
      </div>
    </div>
  );
}
