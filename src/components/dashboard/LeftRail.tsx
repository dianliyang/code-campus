"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
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
  Loader2,
  Map,
  Settings2,
  ShieldCheck,
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
    settingsSecurity: string;
    settingsSystem: string;
    settingsApiControl: string;
    settingsApiReference: string;
    docs?: string;
    import: string;
  };
}

const commandNavItems = [
  { href: "/roadmap", key: "studyPlan", icon: Map },
  { href: "/assist", key: "smartPlanner", icon: Sparkles },
  { href: "/calendar", key: "studySchedule", icon: CalendarDays },
  { href: "/identity", key: "identity", icon: User },
] as const;

const hubNavItems = [
  { href: "/courses", key: "courses", icon: GraduationCap },
  { href: "/projects-seminars", key: "projectsSeminars", icon: FolderKanban },
  { href: "/workouts", key: "workouts", icon: Dumbbell },
] as const;

const settingsNavItems = [
  { href: "/settings/engine", key: "settingsEngine", icon: BrainCog },
  { href: "/settings/usage", key: "settingsUsage", icon: BarChart3 },
  { href: "/settings/security", key: "settingsSecurity", icon: ShieldCheck },
  { href: "/settings/system", key: "settingsSystem", icon: Settings2 },
  { href: "/settings/api-management", key: "settingsApiControl", icon: KeyRound },
  { href: "/settings/import", key: "import", icon: FileUp },
] as const;

const docsNavItems = [
  { href: "/settings/api-reference", key: "settingsApiReference", icon: BookOpen },
] as const;

function SidebarLinkItem({
  href,
  title,
  icon: Icon,
  active,
  trailingSpin = false,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  trailingSpin?: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={title}
        className={active ? "bg-sidebar-accent/90 font-semibold text-sidebar-foreground" : ""}
      >
        <Link
          href={href}
          prefetch={false}
          className={active ? "font-semibold text-foreground" : ""}
        >
          <Icon />
          <span>{title}</span>
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
        className={`sticky top-0 z-10 bg-sidebar px-3 py-3 flex-row items-center ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <Link
          href="/courses"
          className={`flex h-8 items-center gap-2.5 ${collapsed ? "opacity-0 pointer-events-none" : ""}`}
          title="Athena"
        >
          <Image src="/athena.svg" alt="Athena" width={22} height={22} />
          {!collapsed && <span className="font-brand text-base leading-none">Athena</span>}
        </Link>
        <SidebarTrigger className={collapsed ? "absolute left-1/2 -translate-x-1/2" : ""} />
      </SidebarHeader>

      <SidebarContent>
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
                return <SidebarLinkItem key={item.href} href={item.href} title={title} icon={item.icon} active={active} />;
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
                return <SidebarLinkItem key={item.href} href={item.href} title={title} icon={item.icon} active={active} />;
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
                return <SidebarLinkItem key={item.href} href={item.href} title={title} icon={item.icon} active={pathname === item.href} />;
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="sticky bottom-0 z-10 bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Help">
              <CircleHelp />
              <span>Help</span>
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
