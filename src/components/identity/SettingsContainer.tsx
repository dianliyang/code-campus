"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  LucideIcon,
  Cpu,
  Database,
  Library,
  KeyRound,
  BookOpen } from
"lucide-react";
import { Dictionary } from "@/lib/dictionary";
import {
  getSettingsPathForSection,
  getSettingsSectionFromPathname } from
"./settings-route";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

const AISettingsCard = dynamic(() => import("./AISettingsCard"), {
  ssr: false
});
const EngineSettingsPanel = dynamic(() => import("./EngineSettingsPanel"), {
  ssr: false
});
const SystemMaintenanceCard = dynamic(() => import("./SystemMaintenanceCard"), {
  ssr: false
});
const ImportForm = dynamic(() => import("@/components/import/ImportForm"), {
  ssr: false
});
const ApiManagementCard = dynamic(() => import("./ApiManagementCard"), {
  ssr: false
});
const ExternalApiSwagger = dynamic(() => import("./ExternalApiSwagger"), {
  ssr: false
});

export type SectionId =
"engine" |
"usage" |
"sync" |
"import" |
"api-management" |
"api-reference";

type NavItem = {id: SectionId;label: string;icon: LucideIcon;};

const NAV_GROUPS: Array<{label: string;items: NavItem[];}> = [
{
  label: "Intelligence",
  items: [
  { id: "engine", label: "Engine", icon: Cpu }]

},
{
  label: "Synchronization",
  items: [
  { id: "sync", label: "Synchronization", icon: Database },
  { id: "api-management", label: "API Control", icon: KeyRound }]

},
{
  label: "Doc",
  items: [{ id: "api-reference", label: "API Reference", icon: BookOpen }]
},
{
  label: "Import",
  items: [{ id: "import", label: "Import", icon: Library }]
}];


const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const ACTIVE_SECTION_STORAGE_KEY = "settings_active_section";

const SECTION_META: Record<SectionId, {title: string;desc: string;}> = {
  engine: {
    title: "Engine",
    desc: "Control provider, default model, and grounded retrieval behavior."
  },
  usage: {
    title: "Usage Statistic",
    desc: "AI call history, token usage, and cost breakdown."
  },
  sync: {
    title: "Synchronization",
    desc: "Synchronize course catalogs from institution scrapers."
  },
  import: {
    title: "Import",
    desc: "Import course data packages into the registry."
  },
  "api-management": {
    title: "API Control",
    desc: "Manage API key and endpoint enable/disable state."
  },
  "api-reference": {
    title: "API Reference",
    desc: "Reference endpoints, auth and usage examples."
  }
};

const AI_SECTIONS: SectionId[] = ["engine", "usage"];

interface SettingsContainerProps {
  profile: Record<string, unknown> | null;
  aiDefaults: {
    modelCatalog: {
      perplexity: string[];
      gemini: string[];
      openai: string[];
      vertex?: string[];
    };
  };
  initialSection?: SectionId;
  dict: Dictionary;
}

export default function SettingsContainer({
  profile,
  aiDefaults,
  initialSection,
  dict
}: SettingsContainerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeState, setActiveState] = useState<SectionId>(() => {
    const sectionFromPath = getSettingsSectionFromPathname(
      pathname,
      initialSection || "engine"
    );
    if (
    sectionFromPath &&
    ALL_ITEMS.some((item) => item.id === sectionFromPath))
    {
      return sectionFromPath;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
        if (saved && ALL_ITEMS.some((item) => item.id === saved)) {
          return saved as SectionId;
        }
      } catch {



        // Ignore storage access errors.
      }}return sectionFromPath || "engine";});
  const active = useMemo<SectionId>(() => {
    if (pathname?.startsWith("/settings")) {
      const routeSection = getSettingsSectionFromPathname(
        pathname,
        initialSection || "engine"
      );
      if (ALL_ITEMS.some((item) => item.id === routeSection))
      return routeSection;
    }
    return activeState;
  }, [pathname, initialSection, activeState]);

  const setActiveSection = (next: SectionId) => {
    setActiveState(next);
    try {
      window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, next);
    } catch {



      // Ignore storage access errors.
    }const targetPath = getSettingsPathForSection(next);if (targetPath && pathname !== targetPath) {router.push(targetPath);
    }
  };

  // Prevent hydration mismatch by not rendering anything that depends on 'active'
  // until mounted if we were to change 'active' based on localStorage.
  // However, since we default to 'initialSection' or 'engine', we are safe to render.

  const meta = SECTION_META[active];

  // Determine which group the active section belongs to
  const activeGroupLabel = NAV_GROUPS.find((group) =>
  group.items.some((item) => item.id === active)
  )?.label;

  // Only show the group that contains the active item
  const filteredGroups = NAV_GROUPS.filter(
    (group) => group.label === activeGroupLabel
  );
  const totalItems = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  const showSubSidebar =
  totalItems > 1 &&
  active !== "engine" &&
  active !== "usage" &&
  active !== "sync" &&
  active !== "api-management";

  return (
    <div className="flex h-full gap-0">
      {/* ── Desktop sidebar ── */}
      {showSubSidebar &&
      <Card>
          {filteredGroups.map((group) =>
        <div key={group.label} className="mb-3">
              {group.items.map(({ id, label, icon: Icon }) =>
          <Button
            variant="outline"
            key={id}
            onClick={() => setActiveSection(id)}>





            
                  <Icon className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Button>
          )}
            </div>
        )}
        </Card>
      }

      {/* ── Content panel ── */}
      <div
        className={`flex-1 min-w-0 h-full flex flex-col ${showSubSidebar ? "sm:pl-5" : ""}`}>
        
        {/* Mobile nav — horizontal scrollable pills */}
        {showSubSidebar &&
        <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
            {filteredGroups.
          flatMap((g) => g.items).
          map(({ id, label }) =>
          <Button
            variant="outline"
            key={id}
            onClick={() => setActiveSection(id)}>





            
                  {label}
                </Button>
          )}
          </div>
        }

        {/* Section header */}
        <div className="z-20 -mx-4 shrink-0 bg-background/95 px-4 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:sticky md:top-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[#1f1f1f]">
                {meta.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{meta.desc}</p>
            </div>
          </div>
        </div>

        {active === "engine" ?
        <div className="flex-1 min-h-0 flex flex-col">
            <EngineSettingsPanel
            initialProvider={profile?.ai_provider as string || "perplexity"}
            initialModel={
            profile?.ai_default_model as string ||
            aiDefaults.modelCatalog.perplexity[0] ||
            aiDefaults.modelCatalog.openai[0] ||
            aiDefaults.modelCatalog.gemini[0] ||
            ""
            }
            initialWebSearchEnabled={
            profile?.ai_web_search_enabled as boolean | undefined ?? false
            }
            modelCatalog={aiDefaults.modelCatalog} />
          
          </div> :
        null}

        {AI_SECTIONS.includes(active) && active !== "engine" ?
        <div className="flex-1 min-h-0 flex flex-col">
            <AISettingsCard
            key={`${active}-${profile ? JSON.stringify(profile) : "default-ai"}`}
            section={active as "usage"}
            initialProvider={profile?.ai_provider as string || "perplexity"}
            initialModel={
            profile?.ai_default_model as string ||
            aiDefaults.modelCatalog.perplexity[0] ||
            aiDefaults.modelCatalog.openai[0] ||
            aiDefaults.modelCatalog.gemini[0] ||
            ""
            }
            initialWebSearchEnabled={
            profile?.ai_web_search_enabled as boolean | undefined ?? false
            }
            modelCatalog={aiDefaults.modelCatalog} />
          
          </div> :
        null}

        {/* Data Synchronization */}
        <div className={active === "sync" ? "flex-1 min-h-0" : "hidden"}>
          <SystemMaintenanceCard />
        </div>

        {/* Import */}
        <div className={active === "import" ? "flex-1 min-h-0" : "hidden"}>
          <ImportForm dict={dict?.dashboard?.import} />
        </div>

        {/* API Control */}
        <div
          className={active === "api-management" ? "flex-1 min-h-0" : "hidden"}>
          
          <ApiManagementCard />
        </div>

        {/* API Reference */}
        <div
          className={
          active === "api-reference" ? "flex-1 min-h-0 h-full" : "hidden"
          }>
          
          <div className="h-full min-h-0 flex flex-col gap-4">
            <div className="shrink-0">
              <p className="text-sm text-[#666]">
                External endpoints require{" "}
                <code>x-api-key: &lt;your_generated_key&gt;</code> and use{" "}
                <code>application/json</code>.
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ExternalApiSwagger />
            </div>
          </div>
        </div>
      </div>
    </div>);

}
