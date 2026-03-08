"use client";

import { useEffect, useState } from "react";
import { Workout } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { cn } from "@/lib/utils";
import { getWorkoutDurationUrl } from "@/lib/workout-links";
import WorkoutCard from "./WorkoutCard";
import WorkoutListHeader from "./WorkoutListHeader";
import { Check, ChevronDown, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toggleWorkoutEnrollmentAction } from "@/actions/courses";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WorkoutListProps {
  initialWorkouts: Workout[];
  initialEnrolledIds: number[];
  dict: Dictionary["dashboard"]["workouts"];
  categoryGroups: Array<{
    category: string;
    count: number;
    minStudentPrice: number | null;
    maxStudentPrice: number | null;
  }>;
  selectedCategory: string;
}

const statusStyle: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-100",
  fully_booked: "bg-rose-50 text-rose-700 border-rose-100",
  expired: "bg-slate-50 text-slate-600 border-slate-100",
  waitlist: "bg-amber-50 text-amber-700 border-amber-100",
  cancelled: "bg-rose-50 text-rose-700 border-rose-100",
  see_text: "bg-sky-50 text-sky-700 border-sky-100",
};

function IconActionGroup({
  isEnrolled,
  isEnrollmentPending,
  onToggleEnroll,
  workoutId,
  bookingHref,
  standalone = false,
}: {
  isEnrolled: boolean;
  isEnrollmentPending: boolean;
  onToggleEnroll: (workoutId: number) => void;
  workoutId: number;
  bookingHref: string | null;
  standalone?: boolean;
}) {
  const buttonClass = standalone
    ? "h-8 w-8 rounded-md"
    : "h-7 w-7 rounded-none border-0 px-0 shadow-none first:rounded-l-md last:rounded-r-md";

  const enrollButton = (
    <Button
      variant={isEnrolled ? "secondary" : "outline"}
      size="icon"
      type="button"
      className={cn(
        buttonClass,
        isEnrolled && !standalone && "bg-muted text-foreground",
        standalone && "border-border"
      )}
      disabled={isEnrollmentPending}
      onClick={() => void onToggleEnroll(workoutId)}
      aria-label={isEnrolled ? "Enrolled" : "Enroll"}
      title={isEnrolled ? "Enrolled" : "Enroll"}
    >
      {isEnrolled ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
    </Button>
  );

  const bookingButton = bookingHref ? (
    <Button
      variant="outline"
      size="icon"
      asChild
      className={cn(buttonClass, standalone && "border-border")}
    >
      <a
        href={bookingHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open booking"
        title="Open booking"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </Button>
  ) : (
    <Button
      variant="outline"
      size="icon"
      disabled
      className={cn(
        buttonClass,
        "bg-muted text-muted-foreground",
        standalone && "border-border"
      )}
    >
      <ExternalLink className="h-3.5 w-3.5" />
    </Button>
  );

  if (standalone) {
    return (
      <div className="flex items-center gap-2">
        {enrollButton}
        {bookingButton}
      </div>
    );
  }

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-input bg-background">
      {enrollButton}
      <div className="w-px bg-input" />
      {bookingButton}
    </div>
  );
}

function getStatusLabel(
  status: string | null,
  dict: Dictionary["dashboard"]["workouts"],
) {
  if (!status) return "-";
  const statusMap: Record<
    string,
    keyof Dictionary["dashboard"]["workouts"]
  > = {
    available: "status_available",
    fully_booked: "status_full",
    expired: "status_expired",
    waitlist: "status_waitlist",
    cancelled: "status_cancelled",
    see_text: "status_details",
  };
  const key = statusMap[status];
  return key && dict[key] ? String(dict[key]) : status;
}

export default function WorkoutList({
  initialWorkouts,
  initialEnrolledIds,
  dict,
  categoryGroups,
  selectedCategory,
}: WorkoutListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    const savedMode = localStorage.getItem("workoutViewMode");
    return savedMode === "grid" || savedMode === "list" ? savedMode : "list";
  });
  const [expandedGridCategory, setExpandedGridCategory] = useState<string | null>(
    selectedCategory || null,
  );
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);
  const [pendingIds, setPendingIds] = useState<Record<number, boolean>>({});

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingCategory, setRefreshingCategory] = useState<string | null | undefined>(undefined);
  const { showToast } = useAppToast();

  const workouts: Workout[] = initialWorkouts;
  const effectiveViewMode: "list" | "grid" = viewMode;

  const refreshList = async (category?: string) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshingCategory(category === undefined ? null : category);
    try {
      const res = await fetch("/api/workouts/refresh", { 
        method: "POST",
        body: JSON.stringify({ category }),
        headers: { "Content-Type": "application/json" }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to refresh workouts");
      }
      const count = typeof body?.count === "number" ? body.count : null;
      showToast({
        message:
          count !== null
            ? `Refresh complete: ${count} items synced ${category ? `for ${category}` : ""}`
            : "Refresh complete",
        type: "success",
      });
      router.refresh();
    } catch (error) {
      console.error("[WorkoutList] Refresh failed:", error);
      showToast({
        message: error instanceof Error ? error.message : "Refresh failed",
        type: "error",
      });
    } finally {
      setIsRefreshing(false);
      setRefreshingCategory(undefined);
    }
  };

  const selectedGroup = {
    category: selectedCategory,
    items: workouts,
  };

  const formatPrice = (value: number | null) =>
    value == null ? "-" : Number(value).toFixed(2);

  const selectedActionHref =
    selectedGroup.items.find((w) => w.bookingUrl || w.url)?.bookingUrl ||
    selectedGroup.items.find((w) => w.bookingUrl || w.url)?.url ||
    null;

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("workoutViewMode", mode);
  };

  const setCategoryOnServer = (category: string) => {
    if (category === selectedCategory) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setEnrolledIds(initialEnrolledIds);
  }, [initialEnrolledIds]);

  useEffect(() => {
    if (!searchParams.get("category") && selectedCategory) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", selectedCategory);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, selectedCategory, router, pathname]);

  const handleToggleEnroll = async (workoutId: number) => {
    if (pendingIds[workoutId]) return;
    const isEnrolled = enrolledIds.includes(workoutId);
    setPendingIds((current) => ({ ...current, [workoutId]: true }));
    setEnrolledIds((current) =>
      isEnrolled ? current.filter((id) => id !== workoutId) : [...current, workoutId]
    );

    try {
      await toggleWorkoutEnrollmentAction(workoutId, isEnrolled);
    } catch {
      setEnrolledIds((current) =>
        isEnrolled ? [...current, workoutId] : current.filter((id) => id !== workoutId)
      );
    } finally {
      setPendingIds((current) => {
        const next = { ...current };
        delete next[workoutId];
        return next;
      });
    }
  };

  return (
    <main className="h-full min-w-0 flex flex-col">
      <WorkoutListHeader
        viewMode={effectiveViewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        isRefreshing={isRefreshing}
        refreshingCategory={refreshingCategory}
        refreshList={refreshList}
      />

      <div className={`mt-3 min-h-0 flex-1 ${effectiveViewMode === "grid" ? "overflow-y-auto" : "overflow-hidden"}`}>
        {effectiveViewMode === "list" ? (
          <>
            <Card className="hidden h-full min-h-0 overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)] py-0 gap-0">
              <div className="flex h-full min-h-0 flex-col border-r">
                  <div className="flex h-12 items-center justify-between border-b px-3">
                    <span className="text-sm font-bold tracking-tight text-foreground uppercase">
                      {dict?.sidebar_categories || "Category"}
                    </span>
                    <Badge variant="secondary" className="font-bold">{categoryGroups.length}</Badge>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {categoryGroups.map((group, index) => {
                      const active = selectedCategory === group.category;
                      const priceRange =
                        group.minStudentPrice == null
                          ? "-"
                          : group.minStudentPrice === group.maxStudentPrice
                            ? `€${formatPrice(group.minStudentPrice)}`
                            : `from €${formatPrice(group.minStudentPrice)}`;

                      return (
                        <div key={group.category}>
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setCategoryOnServer(group.category)}
                            className={`h-auto w-full items-start justify-between px-2 py-2 text-left ${active ? "bg-muted" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {group.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {priceRange}
                              </p>
                            </div>
                            <Badge variant={active ? "outline" : "secondary"}>
                              {group.count}
                            </Badge>
                          </Button>
                          {index < categoryGroups.length - 1 ? (
                            <Separator className="my-1" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-12 items-center justify-between border-b px-4">
                    <p className="truncate text-sm font-bold tracking-tight text-foreground uppercase">
                      {selectedGroup ? `${selectedGroup.category} choices` : "Choices"}
                    </p>
                    <div className="flex items-center gap-2">
                      {selectedCategory && selectedCategory !== "Semester Fee" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshList(selectedCategory)}
                          disabled={isRefreshing}
                          title={`Refresh ${selectedCategory}`}
                        >
                          <RefreshCw
                            className={`mr-1.5 h-3.5 w-3.5 ${refreshingCategory === selectedCategory ? "animate-spin" : ""}`}
                          />
                          Refresh
                        </Button>
                      )}
                      {selectedActionHref && selectedCategory !== "Semester Fee" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={selectedActionHref}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Book Now
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {selectedGroup.items.length === 0 ? (
                      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
                        No workouts in this category.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {selectedGroup.items.map((w) => {
                          const title = w.titleEn || w.title;
                          const statusClass =
                            w.bookingStatus && statusStyle[w.bookingStatus]
                              ? statusStyle[w.bookingStatus]
                              : "bg-slate-50 text-slate-600 border-slate-100";
                          const statusLabel = getStatusLabel(w.bookingStatus, dict);
                          const duration =
                            typeof w.details?.duration === "string"
                              ? w.details.duration
                              : w.startDate && w.endDate
                                ? `${w.startDate} - ${w.endDate}`
                                : "-";
                          const durationHref = getWorkoutDurationUrl(w);
                          const bookingHref = w.bookingUrl || w.url;
                          const isEnrolled = enrolledIds.includes(w.id);

                          return (
                            <div
                              key={w.id}
                              className={`grid gap-3 px-4 py-3 lg:items-center ${
                                selectedCategory === "Semester Fee"
                                  ? "lg:grid-cols-[minmax(0,1fr)_200px_120px_100px_auto]"
                                  : "lg:grid-cols-[minmax(0,1fr)_200px_120px_100px]"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground mb-1">
                                  {title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={statusClass}>{statusLabel}</Badge>
                                  <span className="truncate text-xs text-muted-foreground/70">
                                    {w.locationEn || w.location || "-"}
                                  </span>
                                </div>
                              </div>

                              <div className="text-sm">
                                {durationHref ? (
                                  <a
                                    href={durationHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-sm transition-colors hover:text-foreground"
                                    title="Open schedule details"
                                  >
                                    <p className="font-medium">
                                      <span className="text-muted-foreground">
                                        {w.dayOfWeek || "-"}
                                      </span>{" "}
                                      {w.startTime ? w.startTime.slice(0, 5) : ""}
                                      {w.endTime ? `-${w.endTime.slice(0, 5)}` : ""}
                                    </p>
                                    {typeof w.details?.totalSessions === "number" && w.details.totalSessions > 0 && (
                                      <p className="text-xs mt-0.5">
                                        <span className="font-medium text-foreground">{w.details.totalSessions}</span>
                                        <span className="text-muted-foreground/70 ml-1">sessions</span>
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                      {duration}
                                    </p>
                                  </a>
                                ) : (
                                  <>
                                    <p className="font-medium">
                                      <span className="text-muted-foreground">
                                        {w.dayOfWeek || "-"}
                                      </span>{" "}
                                      {w.startTime ? w.startTime.slice(0, 5) : ""}
                                      {w.endTime ? `-${w.endTime.slice(0, 5)}` : ""}
                                    </p>
                                    {typeof w.details?.totalSessions === "number" && w.details.totalSessions > 0 && (
                                      <p className="text-xs mt-0.5">
                                        <span className="font-medium text-foreground">{w.details.totalSessions}</span>
                                        <span className="text-muted-foreground/70 ml-1">sessions</span>
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                      {duration}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="text-sm lg:text-right space-y-0.5">
                                <p className="text-muted-foreground font-medium">Student: €{formatPrice(w.priceStudent)}</p>
                                <p className="text-muted-foreground/60 text-[10px]">
                                  Staff: €{formatPrice(w.priceStaff)}
                                </p>
                              </div>

                              <div className="flex justify-end">
                                <IconActionGroup
                                  isEnrolled={isEnrolled}
                                  isEnrollmentPending={Boolean(pendingIds[w.id])}
                                  onToggleEnroll={handleToggleEnroll}
                                  workoutId={w.id}
                                  bookingHref={bookingHref || null}
                                  standalone
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
            </Card>

            <div className="space-y-2 md:hidden">
              {workouts.map((workout, idx) => (
                <WorkoutCard
                  key={workout.id}
                  workout={{ ...workout, enrolled: enrolledIds.includes(workout.id) }}
                  viewMode={effectiveViewMode}
                  dict={dict}
                  rowIndex={idx}
                  onToggleEnroll={handleToggleEnroll}
                  isEnrollmentPending={Boolean(pendingIds[workout.id])}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3 p-1">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {categoryGroups.flatMap((group) => {
                const priceRange =
                  group.minStudentPrice == null
                    ? "-"
                    : group.minStudentPrice === group.maxStudentPrice
                      ? `€${formatPrice(group.minStudentPrice)}`
                      : `€${formatPrice(group.minStudentPrice)} ~ €${formatPrice(group.maxStudentPrice)}`;
                const expanded =
                  expandedGridCategory === group.category &&
                  selectedCategory === group.category;
                const visibleChoices = expanded ? workouts : [];

                const categoryCard = (
                  <Card
                    key={group.category}
                    className={expanded ? "bg-black text-white" : undefined}
                    onClick={() => {
                      if (expandedGridCategory === group.category) {
                        setExpandedGridCategory(null);
                        return;
                      }
                      setExpandedGridCategory(group.category);
                      if (selectedCategory !== group.category) {
                        setCategoryOnServer(group.category);
                      }
                    }}
                  >
                    <CardHeader>
                      <CardTitle>{group.category}</CardTitle>
                      <CardAction>
                        <ChevronDown
                          className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardFooter
                      className={`mt-auto text-xs ${
                        expanded ? "text-white/80" : "text-muted-foreground"
                      }`}
                    >
                      <p>
                        <span
                          className={expanded ? "font-medium text-white" : "font-medium text-foreground"}
                        >
                          {group.count}
                        </span>{" "}
                        choices
                      </p>
                      <p className="ml-auto">{priceRange}</p>
                    </CardFooter>
                  </Card>
                );

                if (!expanded) return [categoryCard];

                const choiceCards = visibleChoices.map((workout) => {
                  const bookingHref = workout.bookingUrl || workout.url;
                  const title = workout.titleEn || workout.title;
                  const timeLabel = `${workout.dayOfWeek || "-"} ${workout.startTime ? workout.startTime.slice(0, 5) : ""}${workout.endTime ? `-${workout.endTime.slice(0, 5)}` : ""}`.trim();
                  const dateLabel =
                    workout.startDate && workout.endDate
                      ? `${workout.startDate} - ${workout.endDate}`
                      : workout.startDate || workout.endDate || "-";
                  const statusClass =
                    workout.bookingStatus && statusStyle[workout.bookingStatus]
                      ? statusStyle[workout.bookingStatus]
                      : "bg-slate-50 text-slate-600 border-slate-100";
                  const statusLabel = getStatusLabel(workout.bookingStatus, dict);
                  const isEnrolled = enrolledIds.includes(workout.id);

                  return (
                    <Card
                      key={`${group.category}-${workout.id}`}
                      className={
                        bookingHref
                          ? "cursor-pointer transition-colors hover:bg-muted/60"
                          : undefined
                      }
                      onClick={
                        bookingHref
                          ? () => window.open(bookingHref, "_blank", "noopener,noreferrer")
                          : undefined
                      }
                    >
                      <CardHeader>
                        <CardTitle className="pr-12">{title}</CardTitle>
                        <CardAction
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <IconActionGroup
                            isEnrolled={isEnrolled}
                            isEnrollmentPending={Boolean(pendingIds[workout.id])}
                            onToggleEnroll={handleToggleEnroll}
                            workoutId={workout.id}
                            bookingHref={bookingHref || null}
                            standalone
                          />
                        </CardAction>
                        <CardDescription className="text-xs">
                          <div className="space-y-1">
                            <p className="truncate">{workout.locationEn || workout.location || "-"}</p>
                            <p className="truncate">{dateLabel}</p>
                            <p className="truncate">{timeLabel}</p>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="mt-auto text-xs text-muted-foreground">
                        <Badge className={statusClass}>{statusLabel}</Badge>
                        <p className="ml-auto font-medium text-foreground">
                          €{formatPrice(workout.priceStudent)}
                        </p>
                      </CardFooter>
                    </Card>
                  );
                });

                return [categoryCard, ...choiceCards];
              })}
            </div>
          </div>
        )}

        {workouts.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              {dict?.empty_header || "No matches found"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {dict?.empty_desc || "Try adjusting your current filters."}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
