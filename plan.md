Plan to implement │
│ │
│ Workouts Page Implementation Plan │
│ │
│ Context │
│ │
│ The workouts table and CAUSport scraper are already built. We need a new /workouts page in the dashboard to browse and filter the scraped sport courses from CAU Kiel Sportzentrum. │
│ │
│ Files to Create │
│ │
│ - src/app/(dashboard)/workouts/page.tsx — server component page (modeled on courses/page.tsx) │
│ - src/components/workouts/WorkoutCard.tsx — card component for a single workout (grid + list modes) │
│ - src/components/workouts/WorkoutList.tsx — client container with view toggle, sort, cards grid │
│ - src/components/workouts/WorkoutSidebar.tsx — filter sidebar (categories, booking status, day of week) │
│ │
│ Files to Modify │
│ │
│ - src/components/layout/NavLinks.tsx — add "Workouts" nav item with Dumbbell icon │
│ - src/components/layout/BottomTabBar.tsx — add "Workouts" tab with Dumbbell icon │
│ - src/app/(dashboard)/layout.tsx — pass workouts label to BottomTabBar │
│ - src/types/index.ts — add Workout interface │
│ │
│ Implementation Details │
│ │
│ 1. Add Workout type to src/types/index.ts │
│ │
│ export interface Workout { │
│ id: number; │
│ source: string; │
│ courseCode: string; │
│ category: string; │
│ categoryEn: string | null; │
│ title: string; │
│ titleEn: string | null; │
│ dayOfWeek: string | null; │
│ startTime: string | null; │
│ endTime: string | null; │
│ location: string | null; │
│ locationEn: string | null; │
│ instructor: string | null; │
│ startDate: string | null; │
│ endDate: string | null; │
│ priceStudent: number | null; │
│ priceStaff: number | null; │
│ priceExternal: number | null; │
│ priceExternalReduced: number | null; │
│ bookingStatus: string | null; │
│ bookingUrl: string | null; │
│ url: string | null; │
│ semester: string | null; │
│ details: Record<string, unknown> | null; │
│ } │
│ │
│ 2. workouts/page.tsx — Server Component │
│ │
│ - Same pattern as courses/page.tsx: async RSC with Suspense boundaries │
│ - Search: uses textSearch on search_vector column (already exists) │
│ - Filters via URL params: ?q=, ?categories=, ?days=, ?status=, ?sort=, ?page= │
│ - SidebarData: fetches distinct categories (with counts) and distinct booking statuses │
│ - WorkoutListData: fetches paginated, filtered workouts from Supabase workouts table │
│ - Page size: 12 (same as courses) │
│ - Sort options: title (A-Z), price (low→high), day of week, newest │
│ │
│ 3. WorkoutCard.tsx — Client Component │
│ │
│ - Two modes: grid and list (reuse viewMode pattern from CourseCard) │
│ - Grid card shows: title (EN), category tag, day + time, location, instructor, price (student), booking status badge │
│ - List row shows: same info in a horizontal layout │
│ - Booking status badges with colors: │
│ - available → green │
│ - fully_booked → red │
│ - expired → gray │
│ - waitlist → yellow │
│ - cancelled → red strikethrough │
│ - see_text → blue │
│ - Price displayed as student price with tooltip for all tiers │
│ - External link to booking URL if available │
│ │
│ 4. WorkoutList.tsx — Client Container │
│ │
│ - Reuse patterns from CourseList.tsx: viewMode toggle (localStorage), sort dropdown │
│ - Reuse existing Pagination component (src/components/home/Pagination.tsx) as-is │
│ - Reuse CourseListHeader pattern but with workout-specific sort options │
│ │
│ 5. WorkoutSidebar.tsx — Filter Sidebar │
│ │
│ - Same URL-driven filter pattern as Sidebar.tsx (checkbox groups that push URL params) │
│ - Filter groups: │
│ - Category — checkbox list of sport categories (EN names) with counts │
│ - Day of Week — Mon/Tue/Wed/Thu/Fri/Sat/Sun checkboxes │
│ - Status — available / fully_booked / expired / waitlist checkboxes │
│ │
│ 6. Navigation Updates │
│ │
│ - NavLinks.tsx: Add { name: "Workouts", href: "/workouts", icon: Dumbbell } to dashboard array │
│ - BottomTabBar.tsx: Add workouts tab, update interface to accept workouts label │
│ - layout.tsx: Pass workouts label to BottomTabBar │
│ │
│ Verification │
│ │
│ 1. Run the scraper to populate local DB: seed some test data via npx tsx src/scripts/test-sport-scraper.ts writing to local Supabase, or run SQL INSERT │
│ 2. Visit http://localhost:3000/workouts — verify page loads with workout cards │
│ 3. Test filters: click categories, days, statuses — verify URL params update and results filter │
│ 4. Test search: type in search box — verify text search works │
│ 5. Test pagination: navigate pages │
│ 6. Test responsive: verify grid/list toggle and mobile bottom tab bar
