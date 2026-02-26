export const COURSE_DETAIL_TABS = ["overview", "schedule", "assignments", "grades"] as const;

export type CourseDetailTab = (typeof COURSE_DETAIL_TABS)[number];

interface ResolveInitialCourseDetailTabInput {
  isEnrolled: boolean;
  queryTab?: string | null;
}

function isCourseDetailTab(value: string): value is CourseDetailTab {
  return (COURSE_DETAIL_TABS as readonly string[]).includes(value);
}

export function resolveInitialCourseDetailTab({
  isEnrolled,
  queryTab,
}: ResolveInitialCourseDetailTabInput): CourseDetailTab {
  const normalizedQueryTab = (queryTab || "").trim().toLowerCase();
  if (normalizedQueryTab && isCourseDetailTab(normalizedQueryTab)) {
    return normalizedQueryTab;
  }
  return isEnrolled ? "schedule" : "overview";
}
