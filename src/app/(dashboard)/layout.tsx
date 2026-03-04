import BottomTabBar from "@/components/layout/BottomTabBar";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import DashboardShell from "@/components/dashboard/DashboardShell";
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
      <main className="h-svh w-full overflow-hidden overscroll-none">
        <DashboardShell
          labels={{
            hub: dict.navbar?.hub || "Hub",
            courses: dict.navbar?.courses || "Courses",
            projectsSeminars: dict.navbar?.projects_seminars || "Seminars",
            studyPlan: dict.navbar?.roadmap || "Roadmap",
            smartPlanner: "Smart Assist",
            studySchedule: dict.navbar?.schedule || "Schedule",
            workouts: dict.navbar?.workouts || "Workouts",
            command: dict.navbar?.command || "Command",
            identity: dict.navbar?.identity || "Identity",
            profile: dict.navbar?.identity || "Identity", // Keep for compat if needed
            settings: dict.navbar?.settings || "Settings",
            settingsEngine: dict.navbar?.settings_engine || dict.navbar?.settings_intelligence || "Engine",
            settingsUsage: dict.navbar?.settings_usage || "Usage Statistic",
            settingsSecurity: dict.navbar?.settings_account || dict.navbar?.settings_security || "Account",
            settingsSystem: dict.navbar?.settings_system || "Synchronization",
            settingsApiControl: dict.navbar?.settings_api_control || "API Control",
            settingsApiReference: dict.navbar?.settings_api_reference || "API Reference",
            import: dict.dashboard?.import?.label || "Import",
          }}
        >
          {children}
        </DashboardShell>
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
