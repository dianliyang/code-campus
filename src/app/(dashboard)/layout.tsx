import BottomTabBar from "@/components/layout/BottomTabBar";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LeftRail from "@/components/dashboard/LeftRail";
import OfflineIndicator from "@/components/common/OfflineIndicator";
import { AppToastProvider } from "@/components/common/AppToastProvider";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <AppToastProvider>
      <main className="h-[100svh] bg-[#f5f5f5] overflow-hidden">
        <div className="h-full flex overflow-hidden">
          <LeftRail
            labels={{
              hub: dict.navbar?.hub || "Hub",
              courses: dict.navbar?.courses || "Courses",
              projectsSeminars: dict.navbar?.projects_seminars || "Seminars",
              studyPlan: dict.navbar?.roadmap || "Roadmap",
              studySchedule: dict.navbar?.schedule || "Schedule",
              workouts: dict.navbar?.workouts || "Workouts",
              command: dict.navbar?.command || "Command",
              identity: dict.navbar?.identity || "Identity",
              profile: dict.navbar?.identity || "Identity", // Keep for compat if needed
              settings: dict.navbar?.settings || "Settings",
              settingsEngine: dict.navbar?.settings_engine || dict.navbar?.settings_intelligence || "Engine",
              settingsUsage: dict.navbar?.settings_usage || "Usage",
              settingsSecurity: dict.navbar?.settings_account || dict.navbar?.settings_security || "Account",
              settingsSystem: dict.navbar?.settings_system || "System",
              settingsApiControl: dict.navbar?.settings_api_control || "API Control",
              settingsApiReference: dict.navbar?.settings_api_reference || "API Reference",
              import: dict.dashboard?.import?.label || "Import",
            }}
          />
          <section className="flex-1 min-w-0 h-full overflow-hidden p-1.5 sm:p-2">
            <div id="dashboard-scroll" className="h-full rounded-lg bg-[#fcfcfc] px-2 pt-[2.75rem] pb-0 sm:px-3 sm:pt-3 sm:pb-3 overflow-y-auto">
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
          profile: dict.navbar?.identity || "Identity",
          settings: dict.navbar?.settings || "Settings",
        }}
      />
      <OfflineIndicator />
    </AppToastProvider>
  );
}
