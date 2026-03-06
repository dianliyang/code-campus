"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, User, Dumbbell, Settings, Map, LayoutGrid, Sparkles } from "lucide-react";

interface BottomTabBarProps {
  labels?: {
    overview?: string;
    courses?: string;
    studyPlan?: string;
    studySchedule?: string;
    workouts?: string;
    profile?: string;
    settings?: string;
    assist?: string;
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
      name: labels?.assist || "Assist",
      href: "/assist",
      icon: Sparkles,
      isActive: pathname === "/assist",
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
      <nav className="mx-auto w-full max-w-[720px] rounded-2xl border border-black/[0.08] bg-white/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="no-scrollbar flex items-center justify-between gap-0.5 overflow-x-auto px-1.5 py-1.5">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              aria-current={tab.isActive ? "page" : undefined}
              className={`flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-all ${
                tab.isActive
                  ? "bg-black/5"
                  : "active:bg-black/10"
              }`}
            >
              <tab.icon
                className={`w-[18px] h-[18px] transition-colors ${
                  tab.isActive ? "text-black" : "text-stone-500"
                }`}
                strokeWidth={tab.isActive ? 2.5 : 2}
              />
              <span
                className={`max-w-full truncate text-[9px] font-bold uppercase tracking-tight transition-colors ${
                  tab.isActive ? "text-black" : "text-stone-500"
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
