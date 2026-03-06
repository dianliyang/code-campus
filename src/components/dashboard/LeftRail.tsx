"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  BrainCog,
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Dumbbell,
  FileUp,
  FolderKanban,
  GraduationCap,
  KeyRound,
  LayoutGrid,
  Loader2,
  Map,
  Settings2,
  Sparkles,
  User,
} from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";
import { useCourseIntelSyncJobs } from "@/hooks/useCourseIntelSyncJobs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface LeftRailProps {
  labels: {
    command: string;
    overview: string;
    identity: string;
    hub: string;
    courses: string;
    projectsSeminars: string;
    studyPlan: string;
    smartPlanner: string;
    studySchedule: string;
    workouts: string;
    profile: string;
    settings: string;
    settingsEngine: string;
    settingsUsage: string;
    settingsSystem: string;
    settingsApiControl: string;
    settingsApiReference: string;
    docs?: string;
    import: string;
  };
}

const commandNavItems = [
  { href: "/overview", key: "overview", icon: LayoutGrid, color: "stone" },
  { href: "/roadmap", key: "studyPlan", icon: Map, color: "blue" },
  { href: "/assist", key: "smartPlanner", icon: Sparkles, color: "purple" },
  { href: "/calendar", key: "studySchedule", icon: CalendarDays, color: "emerald" },
  { href: "/identity", key: "identity", icon: User, color: "orange" },
] as const;

const hubNavItems = [
  { href: "/courses", key: "courses", icon: GraduationCap, color: "indigo" },
  { href: "/projects-seminars", key: "projectsSeminars", icon: FolderKanban, color: "amber" },
  { href: "/workouts", key: "workouts", icon: Dumbbell, color: "rose" },
] as const;

const settingsNavItems = [
  { href: "/settings/engine", key: "settingsEngine", icon: BrainCog, color: "cyan" },
  { href: "/settings/usage", key: "settingsUsage", icon: BarChart3, color: "teal" },
  { href: "/settings/system", key: "settingsSystem", icon: Settings2, color: "slate" },
  { href: "/settings/api-management", key: "settingsApiControl", icon: KeyRound, color: "violet" },
  { href: "/settings/import", key: "import", icon: FileUp, color: "brown" },
] as const;

const docsNavItems = [
  { href: "/settings/api-reference", key: "settingsApiReference", icon: BookOpen, color: "sky" },
] as const;

type NavColor = "stone" | "blue" | "purple" | "emerald" | "orange" | "indigo" | "amber" | "rose" | "cyan" | "teal" | "slate" | "violet" | "brown" | "sky";

function SidebarLinkItem({
  href,
  title,
  icon: Icon,
  active,
  color = "stone",
  trailingSpin = false,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  color?: NavColor;
  trailingSpin?: boolean;
}) {
  const colorMap: Record<NavColor, { bg: string; text: string; icon: string }> = {
    stone: { bg: "bg-stone-100", text: "text-stone-900", icon: "text-stone-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-900", icon: "text-blue-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-900", icon: "text-purple-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-900", icon: "text-emerald-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-900", icon: "text-orange-600" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-900", icon: "text-indigo-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-900", icon: "text-amber-600" },
    rose: { bg: "bg-rose-50", text: "text-rose-900", icon: "text-rose-600" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-900", icon: "text-cyan-600" },
    teal: { bg: "bg-teal-50", text: "text-teal-900", icon: "text-teal-600" },
    slate: { bg: "bg-slate-100", text: "text-slate-900", icon: "text-slate-600" },
    violet: { bg: "bg-violet-50", text: "text-violet-900", icon: "text-violet-600" },
    brown: { bg: "bg-stone-100", text: "text-stone-900", icon: "text-stone-600" }, // Approximate
    sky: { bg: "bg-sky-50", text: "text-sky-900", icon: "text-sky-600" },
  };

  const c = colorMap[color];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={title}
        className={cn(
          "transition-all duration-200",
          active ? cn(c.bg, c.text, "font-bold shadow-sm") : "hover:bg-sidebar-accent/50"
        )}
      >
        <Link
          href={href}
          prefetch={false}
          className={active ? cn("font-bold", c.text) : ""}
        >
          <Icon className={cn("transition-colors", active ? c.icon : "text-muted-foreground/70")} strokeWidth={active ? 2.5 : 2} />
          <span className={active ? c.text : ""}>{title}</span>
          {trailingSpin ? <Loader2 className="ml-auto animate-spin" /> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function LeftRail({ labels }: LeftRailProps) {
  const pathname = usePathname();
  const { hasActive } = useCourseIntelSyncJobs();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={`sticky top-0 z-10 bg-sidebar py-3 flex-row items-center ${collapsed ? "justify-center px-0" : "justify-between px-2"}`}
      >
        <Link
          href="/overview"
          className={`flex h-10 items-center gap-3 px-2 ${collapsed ? "hidden" : ""}`}
          title="Athena"
        >
          <Image src="/athena.svg" alt="Athena" width={28} height={28} />
          {!collapsed && <span className="font-brand text-lg leading-none">Athena</span>}
        </Link>
        <SidebarTrigger className={collapsed ? "mx-auto" : ""} />
      </SidebarHeader>

      <SidebarContent className={collapsed ? "px-0" : "px-2"}>
        <SidebarGroup>
          <SidebarGroupLabel>{labels.command}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commandNavItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href);
                const title = labels[item.key as keyof typeof labels] || item.key;
                return (
                  <SidebarLinkItem
                    key={item.href}
                    href={item.href}
                    title={title}
                    icon={item.icon}
                    active={active}
                    color={item.color as NavColor}
                    trailingSpin={item.href === "/roadmap" && hasActive}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{labels.hub}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hubNavItems.map((item) => {
                const active = pathname === item.href || (item.href === "/courses" && pathname.startsWith("/courses/"));
                const title = labels[item.key as keyof typeof labels] || item.key;
                return (
                  <SidebarLinkItem
                    key={item.href}
                    href={item.href}
                    title={title}
                    icon={item.icon}
                    active={active}
                    color={item.color as NavColor}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{labels.settings}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/settings/engine" && (pathname === "/settings" || pathname === "/settings/intelligence"));
                const title = labels[item.key as keyof typeof labels] || item.key;
                return (
                  <SidebarLinkItem
                    key={item.href}
                    href={item.href}
                    title={title}
                    icon={item.icon}
                    active={active}
                    color={item.color as NavColor}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{labels.docs || "Doc"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {docsNavItems.map((item) => {
                const title = labels[item.key as keyof typeof labels] || item.key;
                return (
                  <SidebarLinkItem
                    key={item.href}
                    href={item.href}
                    title={title}
                    icon={item.icon}
                    active={pathname === item.href}
                    color={item.color as NavColor}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`sticky bottom-0 z-10 bg-sidebar ${collapsed ? "px-0" : "px-2"}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help" asChild isActive={pathname === "/help"}>
              <Link href="/help">
                <CircleHelp />
                <span>Help</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div>
          <LogoutButton showLabel={!collapsed} fullWidth={!collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
