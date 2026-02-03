import Navbar from "@/components/layout/Navbar";
import BottomTabBar from "@/components/layout/BottomTabBar";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  // Note: getLanguage must resolve before getDictionary since dict depends on lang

  return (
    <>
      <Navbar dict={dict.navbar} />
      <main className="pb-24 lg:pb-0">
        {children}
      </main>
      <BottomTabBar
        labels={{
          courses: dict.navbar?.courses || "Courses",
          studyPlan: dict.navbar?.roadmap || "Roadmap",
          profile: dict.navbar?.profile || "Profile",
        }}
      />
    </>
  );
}
