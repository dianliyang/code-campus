import BottomTabBar from "@/components/layout/BottomTabBar";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LeftRail from "@/components/dashboard/LeftRail";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <>
      <main className="h-screen bg-[#f5f5f5] overflow-hidden">
        <div className="h-full flex overflow-hidden">
          <LeftRail
            labels={{
              courses: dict.navbar?.courses || "Courses",
              projectsSeminars: dict.navbar?.projects_seminars || "Seminars",
              studyPlan: dict.navbar?.roadmap || "Roadmap",
              workouts: dict.navbar?.workouts || "Workouts",
              profile: dict.navbar?.profile || "Profile",
              settings: dict.navbar?.settings || "Settings",
            }}
          />
          <section className="flex-1 min-w-0 h-full overflow-y-auto p-1.5 sm:p-2">
            <div className="h-full rounded-lg bg-[#fcfcfc] px-2 pt-2 pb-2 sm:px-3 sm:pt-3 sm:pb-3 overflow-y-auto">
              {children}
            </div>
          </section>
        </div>
      </main>
      <BottomTabBar
        labels={{
          courses: dict.navbar?.courses || "Courses",
          studyPlan: dict.navbar?.roadmap || "Roadmap",
          workouts: dict.navbar?.workouts || "Workouts",
          profile: dict.navbar?.profile || "Profile",
          settings: dict.navbar?.settings || "Settings",
        }}
      />
    </>
  );
}
