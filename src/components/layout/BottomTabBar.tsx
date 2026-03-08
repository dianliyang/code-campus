"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  BrainCog,
  CalendarDays,
  Dumbbell,
  Ellipsis,
  FileUp,
  FolderKanban,
  KeyRound,
  LayoutGrid,
  Map,
  Settings2,
  Sparkles,
  User,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface BottomTabBarProps {
  labels?: {
    overview?: string;
    courses?: string;
    studyPlan?: string;
    studySchedule?: string;
    workouts?: string;
    smartPlanner?: string;
    identity?: string;
    projectsSeminars?: string;
    settings?: string;
    settingsEngine?: string;
    settingsUsage?: string;
    settingsSystem?: string;
    settingsApiControl?: string;
    import?: string;
    docs?: string;
    settingsApiReference?: string;
  };
}

export default function BottomTabBar({ labels }: BottomTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
      name: labels?.studySchedule || "Calendar",
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
  ];

  const overflowSections = [
    {
      label: "Command",
      items: [
        {
          name: labels?.smartPlanner || "Assist",
          href: "/assist",
          icon: Sparkles,
          isActive: pathname === "/assist",
        },
        {
          name: labels?.identity || "Identity",
          href: "/identity",
          icon: User,
          isActive: pathname === "/identity",
        },
      ],
    },
    {
      label: "Hub",
      items: [
        {
          name: labels?.projectsSeminars || "S&P",
          href: "/projects-seminars",
          icon: FolderKanban,
          isActive: pathname === "/projects-seminars" || pathname.startsWith("/projects-seminars/"),
        },
      ],
    },
    {
      label: labels?.settings || "Settings",
      items: [
        {
          name: labels?.settingsEngine || "Engine",
          href: "/settings/engine",
          icon: BrainCog,
          isActive: pathname === "/settings" || pathname === "/settings/engine" || pathname === "/settings/intelligence",
        },
        {
          name: labels?.settingsUsage || "Usage Statistics",
          href: "/settings/usage",
          icon: LayoutGrid,
          isActive: pathname === "/settings/usage",
        },
        {
          name: labels?.settingsSystem || "Synchronization",
          href: "/settings/system",
          icon: Settings2,
          isActive: pathname === "/settings/system",
        },
        {
          name: labels?.settingsApiControl || "API Control",
          href: "/settings/api-management",
          icon: KeyRound,
          isActive: pathname === "/settings/api-management",
        },
        {
          name: labels?.import || "Import",
          href: "/settings/import",
          icon: FileUp,
          isActive: pathname === "/settings/import",
        },
      ],
    },
    {
      label: labels?.docs || "Doc",
      items: [
        {
          name: labels?.docs || "Doc",
          href: "/help",
          icon: BookOpen,
          isActive: pathname === "/help",
        },
        {
          name: labels?.settingsApiReference || "API Reference",
          href: "/settings/api-reference",
          icon: BookOpen,
          isActive: pathname === "/settings/api-reference",
        },
      ],
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
                className={`max-w-full truncate text-[10px] font-semibold tracking-tight transition-colors ${
                  tab.isActive ? "text-black" : "text-stone-500"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          ))}
          <button
            type="button"
            aria-label="More"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-all active:bg-black/10"
          >
            <Ellipsis className="w-[18px] h-[18px] text-stone-500" />
            <span className="max-w-full truncate text-[10px] font-semibold tracking-tight text-stone-500">
              More
            </span>
          </button>
        </div>
      </nav>
      <Drawer direction="bottom" open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[78vh] rounded-t-3xl">
          <DrawerHeader className="text-left">
            <DrawerTitle>More</DrawerTitle>
            <DrawerDescription>Quick access to the rest of the dashboard.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <div className="space-y-5">
              {overflowSections.map((section) => (
                <section key={section.label} className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.label}
                  </h3>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setMoreOpen(false)}
                        aria-current={item.isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                          item.isActive
                            ? "border-black/10 bg-black/[0.04] text-black"
                            : "border-black/[0.06] bg-white text-stone-700 active:bg-black/[0.03]"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${item.isActive ? "text-black" : "text-stone-500"}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
