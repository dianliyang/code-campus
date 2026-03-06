"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, User, Dumbbell, Settings, Map, LayoutGrid } from "lucide-react";

interface BottomTabBarProps {
  labels?: {
    overview?: string;
    courses?: string;
    studyPlan?: string;
    studySchedule?: string;
    workouts?: string;
    profile?: string;
    settings?: string;
  };
}

export default function BottomTabBar({ labels }: BottomTabBarProps) {
  const pathname = usePathname();

  const tabs = [
    {
      name: labels?.overview || "Overview",
      href: "/overview",
      icon: LayoutGrid,
      isActive: pathname === "/overview",
    },
    {
      name: labels?.courses || "Courses",
      href: "/courses",
      icon: BookOpen,
      isActive: pathname === "/courses" || pathname.startsWith("/courses/"),
    },
    {
      name: labels?.studyPlan || "Roadmap",
      href: "/roadmap",
      icon: Map,
      isActive: pathname === "/roadmap",
    },
    {
      name: labels?.studySchedule || "Schedule",
      href: "/calendar",
      icon: CalendarDays,
      isActive: pathname === "/calendar",
    },
    {
      name: labels?.workouts || "Workouts",
      href: "/workouts",
      icon: Dumbbell,
      isActive: pathname === "/workouts",
    },
    {
      name: labels?.profile || "Profile",
      href: "/identity",
      icon: User,
      isActive: pathname === "/identity",
    },
    {
      name: labels?.settings || "Settings",
      href: "/settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <div className="lg:hidden fixed left-0 right-0 z-50 px-2 bottom-[max(8px,env(safe-area-inset-bottom,0px))]">
      <nav className="mx-auto w-full max-w-[720px] rounded-2xl border border-white/40 bg-white/65 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55 shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-1 py-1.5">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              aria-current={tab.isActive ? "page" : undefined}
              className={`flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all ${
                tab.isActive
                  ? "bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_1px_8px_rgba(15,23,42,0.12)]"
                  : "hover:bg-white/35"
              }`}
            >
              <tab.icon
                className={`w-[20px] h-[20px] transition-colors ${
                  tab.isActive ? "text-slate-800" : "text-slate-500"
                }`}
              />
              <span
                className={`max-w-full truncate text-[10px] font-medium tracking-tight transition-colors ${
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
