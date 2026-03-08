export function getRoutineChildContainerClassName() {
  return "ml-5 border-l border-border/60 pl-4 space-y-2";
}

export function getCalendarRootCardClassName() {
  return "h-full min-h-0 w-full overflow-hidden border border-border bg-background shadow-sm rounded-2xl flex flex-col lg:flex-row gap-0";
}

export function getCalendarPageShellClassName() {
  return "flex flex-1 min-h-0 overflow-hidden";
}

export function getWeekCalendarHeaderTypography() {
  return {
    titleClassName: "text-xl font-semibold tracking-tight text-foreground",
    subtitleClassName: "text-sm text-muted-foreground",
    getWeekLabel: (weekNumber: number) => `Week ${weekNumber}`,
  };
}

export function getWeekCalendarDayHeaderClassNames(isToday: boolean) {
  return {
    weekdayClassName: isToday ? "text-foreground font-bold" : "text-muted-foreground/60",
    dateNumberClassName: isToday ? "text-foreground font-bold" : "text-foreground",
  };
}

export function getWeekCalendarCardDetailLevel(input: {
  visualHeightPx: number;
  showVerticalTitle: boolean;
}) {
  if (input.showVerticalTitle) return "compact" as const;
  if (input.visualHeightPx >= 76) return "full" as const;
  if (input.visualHeightPx >= 56) return "course" as const;
  if (input.visualHeightPx >= 34) return "time" as const;
  return "compact" as const;
}

export function getWeekCalendarCardContentLayout(detailLevel: "compact" | "time" | "course" | "full") {
  return {
    showMetaAboveTitle: detailLevel !== "compact",
    showTimeRow: detailLevel !== "compact",
    showLocationRow: detailLevel === "full",
    showKindRow: detailLevel === "full",
  };
}

export function getCurrentTimeIndicatorLayout() {
  return {
    showLeftRail: false,
    containerClassName: "justify-end",
    badgeOffsetClassName: "pl-1",
  };
}
