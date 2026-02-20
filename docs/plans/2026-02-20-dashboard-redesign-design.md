# Dashboard Redesign Design

**Goal**: Redesign the full dashboard to match dashboard.png style while preserving existing data flows and feature behavior.

## Architecture
- Move dashboard to a shared 3-pane shell in `src/app/(dashboard)/layout.tsx`.
- New reusable shell components for left rail, page frame, KPI strip, and right activity rail.
- Keep existing route data fetch logic, recompose UI presentation in each page.

## Components
- `src/components/dashboard/DashboardShell.tsx`
- `src/components/dashboard/LeftRail.tsx`
- `src/components/dashboard/RightActivityRail.tsx`
- `src/components/dashboard/PageFrame.tsx`

## Page Mapping
- `/courses`: greeting + KPI + existing list/filter content inside center frame.
- `/study-plan`: existing planner/calendar blocks restyled into new frame.
- `/workouts`: existing list/filter inside new frame.
- `/profile`: existing profile stats inside frame.
- `/settings`: existing settings container inside frame.

## Error/Loading
- Keep existing route loading/error handling, but fit frame container style.

## Testing
- Lint changed files.
- Run existing dashboard-adjacent unit tests.
- Ensure no TypeScript errors in touched components.
