"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, User } from "lucide-react";

interface BottomTabBarProps {
  labels?: {
    courses?: string;
    studyPlan?: string;
    profile?: string;
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
      name: labels?.profile || "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
    },
  ];

  return (
    <div className="lg:hidden fixed left-0 right-0 z-50 px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4px)]">
      <nav className="mx-auto w-full max-w-[520px] rounded-[26px] border border-gray-200/80 bg-white shadow-[0_2px_16px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-around h-[56px] px-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center flex-1 gap-1 py-1.5"
            >
              <tab.icon
                className={`w-[20px] h-[20px] ${
                  tab.isActive ? "text-brand-blue" : "text-gray-400"
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight ${
                  tab.isActive ? "text-brand-blue" : "text-gray-400"
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
