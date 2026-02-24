"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, User, Dumbbell, Settings } from "lucide-react";

interface BottomTabBarProps {
  labels?: {
    courses?: string;
    studyPlan?: string;
    workouts?: string;
    profile?: string;
    settings?: string;
  };
}

export default function BottomTabBar({ labels }: BottomTabBarProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: labels?.courses || "Courses",
      href: "/courses",
      icon: BookOpen,
      isActive: pathname === "/courses" || pathname.startsWith("/courses/"),
    },
    {
      name: labels?.studyPlan || "Roadmap",
      href: "/study-plan",
      icon: CalendarDays,
      isActive: pathname === "/study-plan",
    },
    {
      name: labels?.workouts || "Workouts",
      href: "/workouts",
      icon: Dumbbell,
      isActive: pathname === "/workouts",
    },
    {
      name: labels?.profile || "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
    },
    {
      name: labels?.settings || "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname === "/settings",
    },
  ];

  return (
    <div className="lg:hidden fixed left-0 right-0 z-50 px-3 bottom-[calc(env(safe-area-inset-bottom,0px)+10px)]">
      <nav className="mx-auto w-full max-w-[600px] rounded-[24px] border border-white/45 bg-white/55 backdrop-blur-xl supports-[backdrop-filter]:bg-white/45 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-around h-[58px] px-2 pb-[env(safe-area-inset-bottom,0px)]">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 gap-1 py-1.5 rounded-2xl transition-all ${
                tab.isActive
                  ? "bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_8px_rgba(15,23,42,0.12)]"
                  : "hover:bg-white/35"
              }`}
            >
              <tab.icon
                className={`w-[20px] h-[20px] transition-colors ${
                  tab.isActive ? "text-slate-800" : "text-slate-500"
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight transition-colors ${
                  tab.isActive ? "text-slate-800" : "text-slate-500"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
