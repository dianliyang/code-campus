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
  User,
  CircleHelp,
  Sparkles,
  ShieldCheck,
  Settings2,
  Map,
  BarChart3,
  KeyRound,
  BookOpen,
} from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";

interface LeftRailProps {
  labels: {
    command: string;
    identity: string;
    hub: string;
    courses: string;
    projectsSeminars: string;
    studyPlan: string;
    studySchedule: string;
    workouts: string;
    profile: string; // Keep for compat
    settings: string;
    settingsEngine: string;
    settingsUsage: string;
    settingsSecurity: string;
    settingsSystem: string;
    settingsApiControl: string;
    settingsApiReference: string;
    docs?: string;
    import: string;
  };
}

const commandNavItems = [
  { href: "/study-plan", key: "studyPlan", icon: Map },
  { href: "/study-schedule", key: "studySchedule", icon: CalendarDays },
  { href: "/profile", key: "identity", icon: User },
] as const;

const hubNavItems = [
  { href: "/courses", key: "courses", icon: LayoutDashboard },
  { href: "/projects-seminars", key: "projectsSeminars", icon: FolderKanban },
  { href: "/workouts", key: "workouts", icon: Dumbbell },
] as const;

const settingsNavItems = [
  { href: "/settings/engine", key: "settingsEngine", icon: Sparkles },
  { href: "/settings/usage", key: "settingsUsage", icon: BarChart3 },
  { href: "/settings/security", key: "settingsSecurity", icon: ShieldCheck },
  { href: "/settings/system", key: "settingsSystem", icon: Settings2 },
  { href: "/settings/api-management", key: "settingsApiControl", icon: KeyRound },
  { href: "/settings/import", key: "import", icon: Library },
] as const;

const docsNavItems = [
  { href: "/settings/api-reference", key: "settingsApiReference", icon: BookOpen },
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
      prefetch={false}
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
    <aside className="hidden lg:flex lg:w-[218px] h-full shrink-0 bg-[#f5f5f5] flex-col px-3 py-4 overflow-y-auto">
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

      <div className="mb-1 px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#919191]">
          {labels.command}
        </span>
      </div>

      <nav className="space-y-0.5">
        {commandNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href);
          const title = labels[item.key as keyof typeof labels] || item.key;
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

      <div className="mt-8 mb-1 px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#919191]">
          {labels.hub}
        </span>
      </div>

      <nav className="space-y-0.5">
        {hubNavItems.map((item) => {
          const active = pathname === item.href || (item.href === "/courses" && pathname.startsWith("/courses/"));
          const title = labels[item.key as keyof typeof labels] || item.key;
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

      <div className="mt-8 mb-1 px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#919191]">
          {labels.settings}
        </span>
      </div>

      <nav className="space-y-0.5">
        {settingsNavItems.map((item) => {
          const active = pathname === item.href || 
                        (item.href === "/settings/engine" && (pathname === "/settings" || pathname === "/settings/intelligence"));
          const title = labels[item.key as keyof typeof labels] || item.key;
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

      <div className="mt-8 mb-1 px-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#919191]">
          {labels.docs || "Doc"}
        </span>
      </div>

      <nav className="space-y-0.5">
        {docsNavItems.map((item) => {
          const active = pathname === item.href;
          const title = labels[item.key as keyof typeof labels] || item.key;
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
