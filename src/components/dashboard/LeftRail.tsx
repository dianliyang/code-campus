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
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed?: boolean;
  onToggle?: () => void;
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
  collapsed,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={collapsed ? title : undefined}
      className={`flex items-center rounded-md leading-none transition-colors ${
        collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-2.5 py-2 text-[14px]"
      } ${
        active
          ? "bg-[#e7e7e7] text-[#1f1f1f] font-medium"
          : "text-[#767676] hover:text-[#2a2a2a] hover:bg-[#ededed]"
      }`}
    >
      <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
      {!collapsed && <span>{title}</span>}
    </Link>
  );
}

function GroupLabel({ text, collapsed }: { text: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mb-0.5 px-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#919191]">
        {text}
      </span>
    </div>
  );
}

export default function LeftRail({ labels, collapsed = false, onToggle }: LeftRailProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden lg:flex h-full shrink-0 bg-[#f5f5f5] flex-col py-4 overflow-y-auto transition-[width,padding] duration-200 ${
        collapsed ? "lg:w-[72px] px-2" : "lg:w-[218px] px-3"
      }`}
    >
      <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
        <Link href="/courses" className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5 px-2"}`} title="CodeCampus">
          <Image
            src="/code-campus-logo-bw.svg"
            alt="CodeCampus"
            width={18}
            height={18}
            className="h-[18px] w-[18px]"
          />
          {!collapsed && (
            <span className="text-[24px] tracking-tight font-semibold text-[#2b2b2b]">Codecampus</span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className={`h-8 w-8 rounded-md border border-[#e5e5e5] bg-white text-[#666] hover:text-[#222] hover:bg-[#f7f7f7] flex items-center justify-center ${collapsed ? "hidden" : ""}`}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="mb-3 h-8 w-full rounded-md border border-[#e5e5e5] bg-white text-[#666] hover:text-[#222] hover:bg-[#f7f7f7] flex items-center justify-center"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <GroupLabel text={labels.command} collapsed={collapsed} />
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
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className={collapsed ? "mt-3" : "mt-4"} />
      <GroupLabel text={labels.hub} collapsed={collapsed} />
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
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className={collapsed ? "mt-3" : "mt-4"} />
      <GroupLabel text={labels.settings} collapsed={collapsed} />
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
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className={collapsed ? "mt-3" : "mt-4"} />
      <GroupLabel text={labels.docs || "Doc"} collapsed={collapsed} />
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
              collapsed={collapsed}
            />
          );
        })}
      </nav>

      <div className="mt-auto space-y-0.5">
        <div
          className={`flex items-center rounded-md py-2 text-[14px] text-[#767676] ${
            collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
          }`}
          title={collapsed ? "Help" : undefined}
        >
          <CircleHelp className="h-[15px] w-[15px]" strokeWidth={1.8} />
          {!collapsed && <span>Help</span>}
        </div>
        <div>
          <LogoutButton
            showLabel={!collapsed}
            className={`w-full flex items-center rounded-md py-2 text-[14px] text-[#767676] hover:text-red-600 hover:bg-red-50 transition-colors ${
              collapsed ? "justify-center px-2" : "gap-2.5 px-2.5"
            }`}
          />
        </div>
      </div>
    </aside>
  );
}
