# 30-Task Code Review & Execution Plan

Legend: [ ] pending, [x] done

## Tasks
1. [x] Remove verbose magic-link info log in `src/app/login/page.tsx`.
2. [x] Remove production service-worker success log noise in `src/components/PWARegister.tsx`.
3. [ ] Sanitize email success logging payload in `src/lib/email.ts`.
4. [ ] Review `src/app/(dashboard)/calendar/page.tsx` for schedule rendering regressions.
5. [ ] Review `src/components/home/StudyCalendar.tsx` for optimistic-state consistency.
6. [ ] Review `src/components/home/ActiveCourseTrack.tsx` for status-label consistency.
7. [ ] Review `src/components/courses/CourseDetailContent.tsx` for calendar/day-details coherence.
8. [ ] Review `src/components/courses/WeeklyScheduleCard.tsx` for spacing and action layout consistency.
9. [ ] Review `src/lib/course-detail-calendar.ts` for pure-function boundaries.
10. [ ] Review `src/tests/unit/course-detail-calendar.test.ts` for edge-case coverage gaps.
11. [ ] Review `src/tests/unit/study-calendar-optimistic.test.tsx` for stale-state assumptions.
12. [ ] Review `src/components/identity/ApiManagementCard.tsx` for API-key UX safety.
13. [ ] Review `src/components/identity/CourseStatusChart.tsx` for empty-state behavior.
14. [ ] Review `src/components/identity/LearningProfileChart.tsx` for null-data guards.
15. [ ] Review `src/app/(dashboard)/identity/page.tsx` for data-loading fault tolerance.
16. [ ] Review `src/components/dashboard/DashboardShell.tsx` for navigation-state drift.
17. [ ] Review `src/components/dashboard/LeftRail.tsx` for link-state consistency.
18. [ ] Review `src/app/(dashboard)/roadmap/page.tsx` for in-progress filtering correctness.
19. [ ] Review `src/app/(dashboard)/layout.tsx` for nav labels and dead-link references.
20. [ ] Review `src/components/ui/sidebar.tsx` for keyboard/focus behavior.
21. [ ] Review external API output mapping in `src/lib/external-api.ts`.
22. [ ] Verify assignment `kind` passthrough behavior from metadata/task_kind.
23. [ ] Review `src/app/api/external/courses/[course_code]/plan-submit/route.ts` kind-normalization constraints.
24. [ ] Review `skills/external-course-sync-runner/SKILL.md` for fresh-mode clarity.
25. [ ] Check for accidental sensitive logging in API routes.
26. [ ] Check for accidental hardcoded timezone assumptions.
27. [ ] Run targeted grep audit for `console.log` noise in client components.
28. [ ] Run targeted grep audit for `any` hot spots touched by recent files.
29. [ ] Run lightweight unit test pass for touched calendar modules.
30. [ ] Final repository status check, summarize outcomes, and push.

## Execution Notes
- Task 1: Removed non-essential magic-link console logs; kept error logging path.
- Task 2: Removed PWA registration success log to reduce client console noise in production.
