"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  CalendarDays,
  Dumbbell,
  FolderKanban,
  LayoutDashboard,
  Library,
  Settings,
  User,
  CircleHelp,
} from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";

interface LeftRailProps {
  labels: {
    courses: string;
    projectsSeminars: string;
    studyPlan: string;
    workouts: string;
    profile: string;
    settings: string;
  };
}

const navItems = [
  { href: "/courses", key: "courses", icon: LayoutDashboard },
  { href: "/projects-seminars", key: "projectsSeminars", icon: FolderKanban },
  { href: "/study-plan", key: "studyPlan", icon: CalendarDays },
  { href: "/workouts", key: "workouts", icon: Dumbbell },
  { href: "/profile", key: "profile", icon: User },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

function RailItem({
  href,
  title,
  icon: Icon,
  active,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] leading-none transition-colors ${
        active
          ? "bg-[#e7e7e7] text-[#1f1f1f] font-medium"
          : "text-[#767676] hover:text-[#2a2a2a] hover:bg-[#ededed]"
      }`}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
      <span>{title}</span>
    </Link>
  );
}

export default function LeftRail({ labels }: LeftRailProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-[218px] h-full shrink-0 bg-[#f5f5f5] flex-col px-3 py-4">
      <Link href="/courses" className="flex items-center gap-2.5 px-2 mb-5" title="CodeCampus">
        <Image
          src="/code-campus-logo-bw.svg"
          alt="CodeCampus"
          width={18}
          height={18}
          className="h-[18px] w-[18px]"
        />
        <span className="text-[24px] tracking-tight font-semibold text-[#2b2b2b]">Codecampus</span>
      </Link>

      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/courses" && pathname.startsWith(item.href));
          const title = labels[item.key] || item.key;
          return (
            <RailItem
              key={item.href}
              href={item.href}
              title={title}
              icon={item.icon}
              active={active}
            />
          );
        })}
      </nav>

      <div className="my-4 border-t border-[#e3e3e3]" />

      <nav className="space-y-0.5">
        <RailItem href="/import" title="Import" icon={Library} active={pathname.startsWith("/import")} />
      </nav>

      <div className="mt-auto space-y-0.5">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[14px] text-[#767676]">
          <CircleHelp className="h-[15px] w-[15px]" strokeWidth={1.8} />
          <span>Help</span>
        </div>
        <div>
          <LogoutButton
            showLabel
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[14px] text-[#767676] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          />
        </div>
      </div>
    </aside>
  );
}
