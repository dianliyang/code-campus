export function getRoutineChildContainerClassName() {
  return "ml-5 border-l border-border/60 pl-4 space-y-2";
}

export function getCalendarRootCardClassName() {
  return "w-full overflow-clip border border-border bg-background shadow-sm rounded-2xl flex flex-col gap-0 lg:h-full lg:min-h-0 lg:overflow-hidden lg:flex-row";
}

export function getCalendarPageShellClassName() {
  return "w-full lg:flex lg:flex-1 lg:min-h-0 lg:overflow-hidden";
}

export function getCalendarRoutineListClassName() {
  return "space-y-2 pr-1 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-auto lg:no-scrollbar";
}

export function getCalendarTimelineScrollerClassName() {
  return "relative bg-background lg:flex-1 lg:overflow-auto lg:no-scrollbar";
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
