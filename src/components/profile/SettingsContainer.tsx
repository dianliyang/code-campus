"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LucideIcon, Cpu, FileCode, CalendarDays, Tag, Shield, Database, Sparkles, Library, KeyRound, BookOpen } from "lucide-react";
import AILearningPlanner from "@/components/home/AILearningPlanner";
import { Dictionary } from "@/lib/dictionary";
import { getSettingsPathForSection, getSettingsSectionFromPathname } from "./settings-route";

const AISettingsCard = dynamic(() => import("./AISettingsCard"), { ssr: false });
const SecurityIdentitySection = dynamic(() => import("./SecurityIdentitySection"), { ssr: false });
const SystemMaintenanceCard = dynamic(() => import("./SystemMaintenanceCard"), { ssr: false });
const ImportForm = dynamic(() => import("@/components/import/ImportForm"), { ssr: false });
const ApiManagementCard = dynamic(() => import("./ApiManagementCard"), { ssr: false });
const ExternalApiSwagger = dynamic(() => import("./ExternalApiSwagger"), { ssr: false });

export type SectionId =
  | "engine" | "metadata" | "scheduling" | "study-planner" | "learning-planner" | "topics" | "course-intel" | "usage"
  | "identity" | "account"
  | "sync" | "import" | "api-management" | "api-reference";

type NavItem = { id: SectionId; label: string; icon: LucideIcon };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Intelligence",
    items: [
      { id: "learning-planner", label: "AI Learning Planner", icon: Sparkles },
      { id: "engine",        label: "Engine Configuration", icon: Cpu },
      { id: "metadata",      label: "Metadata Logic",       icon: FileCode },
      { id: "scheduling",    label: "Scheduling Logic",     icon: CalendarDays },
      { id: "topics",        label: "Domain Logic", icon: Tag },
      { id: "course-intel",      label: "Course Intel Logic",         icon: Sparkles },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "identity", label: "Account", icon: Shield },
    ],
  },
  {
    label: "System",
    items: [
      { id: "sync", label: "Data Synchronization", icon: Database },
      { id: "api-management", label: "API Control", icon: KeyRound },
    ],
  },
  {
    label: "Doc",
    items: [
      { id: "api-reference", label: "API Reference", icon: BookOpen },
    ],
  },
  {
    label: "Import",
    items: [
      { id: "import", label: "Catalog Ingestion", icon: Library },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const ACTIVE_SECTION_STORAGE_KEY = "settings_active_section";

const SECTION_META: Record<SectionId, { title: string; desc: string }> = {
  "engine":        { title: "Engine Configuration",   desc: "Configure AI providers, models and web grounding." },
  "metadata":      { title: "Metadata Logic",         desc: "Prompt template for course description generation." },
  "scheduling":    { title: "Scheduling Logic",       desc: "Prompt template for study plan generation." },
  "study-planner": { title: "Study Planner Logic",    desc: "Prompt template for AI planner course recommendations." },
  "learning-planner": { title: "AI Learning Planner", desc: "Generate and apply roadmap recommendations directly from Settings." },
  "topics":        { title: "Domain Logic",   desc: "Prompt template for topic tagging." },
  "course-intel":      { title: "Course Intel Logic",      desc: "Merged prompt for resources, syllabus, and assignments retrieval." },
  "usage":             { title: "Usage Statistics",       desc: "AI call history, token usage, and cost breakdown." },
  "identity":      { title: "Account",                desc: "Authentication provider, account status, and danger zone." },
  "account":       { title: "Account",                desc: "Danger zone — irreversible operations." },
  "sync":          { title: "Data Synchronization",   desc: "Synchronize course catalogs from institution scrapers." },
  "import":        { title: "Catalog Ingestion",      desc: "Import course data packages into the registry." },
  "api-management": { title: "API Control",           desc: "Manage API key and endpoint enable/disable state." },
  "api-reference":  { title: "API Reference",         desc: "Reference endpoints, auth and usage examples." },
};

const AI_SECTIONS: SectionId[] = ["engine", "metadata", "scheduling", "topics", "course-intel", "usage"];

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
  aiDefaults: {
    modelCatalog: { perplexity: string[]; gemini: string[]; openai: string[]; vertex?: string[] };
  };
  initialSection?: SectionId;
  dict: Dictionary;
}

export default function SettingsContainer({ user, profile, aiDefaults, initialSection, dict }: SettingsContainerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<SectionId>(() => {
    const sectionFromPath = getSettingsSectionFromPathname(pathname, initialSection || "engine");
    if (sectionFromPath && ALL_ITEMS.some((item) => item.id === sectionFromPath)) {
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
      }
    }
    return sectionFromPath || "engine";
  });

  const setActiveSection = (next: SectionId) => {
    setActive(next);
    try {
      window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, next);
    } catch {
      // Ignore storage access errors.
    }
    const targetPath = getSettingsPathForSection(next);
    if (targetPath && pathname !== targetPath) {
      router.push(targetPath);
    }
  };

  // Prevent hydration mismatch by not rendering anything that depends on 'active' 
  // until mounted if we were to change 'active' based on localStorage.
  // However, since we default to 'initialSection' or 'engine', we are safe to render.

  const meta = SECTION_META[active];

  // Determine which group the active section belongs to
  const activeGroupLabel = NAV_GROUPS.find(group => 
    group.items.some(item => item.id === active)
  )?.label;

  // Only show the group that contains the active item
  const filteredGroups = NAV_GROUPS.filter(group => group.label === activeGroupLabel);
  const totalItems = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  const showSubSidebar =
    totalItems > 1 &&
    active !== "usage" &&
    active !== "sync" &&
    active !== "api-management";

  return (
    <div className="flex h-full gap-0">

      {/* ── Desktop sidebar ── */}
      {showSubSidebar && (
        <aside className="hidden sm:flex flex-col w-[220px] shrink-0 h-full overflow-y-auto border-r border-[#f0f0f0] pr-2 py-0.5">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-3">
              {group.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left ${
                    active === id
                      ? "bg-[#e7e7e7] text-[#1f1f1f]"
                      : "text-[#767676] hover:text-[#2a2a2a] hover:bg-[#ededed]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
      )}

      {/* ── Content panel ── */}
      <div className={`flex-1 min-w-0 h-full flex flex-col ${showSubSidebar ? "sm:pl-5" : ""}`}>

        {/* Mobile nav — horizontal scrollable pills */}
        {showSubSidebar && (
          <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
            {filteredGroups.flatMap(g => g.items).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  active === id
                    ? "bg-brand-blue text-white"
                    : "bg-[#ededed] text-[#666] hover:bg-[#e5e5e5]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Section header */}
        <div className="mb-3 shrink-0">
          <h3 className="text-base font-semibold text-[#1f1f1f]">{meta.title}</h3>
          <p className="text-xs text-[#7a7a7a] mt-0.5">{meta.desc}</p>
        </div>

        {AI_SECTIONS.includes(active) ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <AISettingsCard
              key={`${active}-${profile ? JSON.stringify(profile) : "default-ai"}`}
              section={active as "engine" | "metadata" | "scheduling" | "topics" | "course-intel" | "usage"}
              initialProvider={(profile?.ai_provider as string) || "perplexity"}
              initialModel={(profile?.ai_default_model as string) || aiDefaults.modelCatalog.perplexity[0] || aiDefaults.modelCatalog.openai[0] || aiDefaults.modelCatalog.gemini[0] || ""}
              initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
              initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
              initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
              initialPlannerPromptTemplate={(profile?.ai_planner_prompt_template as string) || ""}
              initialTopicsPromptTemplate={(profile?.ai_topics_prompt_template as string) || ""}
              initialCourseUpdatePromptTemplate={(profile?.ai_course_update_prompt_template as string) || ""}
              initialSyllabusPromptTemplate={(profile?.ai_syllabus_prompt_template as string) || ""}
              initialCourseIntelPromptTemplate={(profile?.ai_course_intel_prompt_template as string) || ""}
              modelCatalog={aiDefaults.modelCatalog}
            />
          </div>
        ) : null}

        {/* AI Learning Planner (Merged with Study Planner Logic) */}
        <div className={active === "learning-planner" ? "flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto" : "hidden"}>
          <AILearningPlanner />
          
          <div className="border-t border-[#f0f0f0] pt-6">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-wider">Planner Logic Configuration</h4>
              <p className="text-xs text-[#7a7a7a] mt-1">Configure the prompt templates and model settings for the study planner.</p>
            </div>
            <AISettingsCard
              key={`study-planner-logic-${profile ? JSON.stringify(profile) : "default-ai"}`}
              section="study-planner"
              initialProvider={(profile?.ai_provider as string) || "perplexity"}
              initialModel={(profile?.ai_default_model as string) || aiDefaults.modelCatalog.perplexity[0] || aiDefaults.modelCatalog.openai[0] || aiDefaults.modelCatalog.gemini[0] || ""}
              initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
              initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
              initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
              initialPlannerPromptTemplate={(profile?.ai_planner_prompt_template as string) || ""}
              initialTopicsPromptTemplate={(profile?.ai_topics_prompt_template as string) || ""}
              initialCourseUpdatePromptTemplate={(profile?.ai_course_update_prompt_template as string) || ""}
              initialSyllabusPromptTemplate={(profile?.ai_syllabus_prompt_template as string) || ""}
              initialCourseIntelPromptTemplate={(profile?.ai_course_intel_prompt_template as string) || ""}
              modelCatalog={aiDefaults.modelCatalog}
            />
          </div>
        </div>

        {/* Account (Identity + Danger Zone) */}
        <div className={active === "identity" ? "flex-1 min-h-0" : "hidden"}>
          <div className="space-y-4">
            <SecurityIdentitySection view="identity" provider={user.app_metadata.provider} />
            <SecurityIdentitySection view="account" provider={user.app_metadata.provider} />
          </div>
        </div>

        {/* Data Synchronization */}
        <div className={active === "sync" ? "flex-1 min-h-0" : "hidden"}>
          <SystemMaintenanceCard />
        </div>

        {/* Catalog Ingestion */}
        <div className={active === "import" ? "flex-1 min-h-0" : "hidden"}>
          <ImportForm dict={dict?.dashboard?.import} />
        </div>

        {/* API Control */}
        <div className={active === "api-management" ? "flex-1 min-h-0" : "hidden"}>
          <ApiManagementCard />
        </div>

        {/* API Reference */}
        <div className={active === "api-reference" ? "flex-1 min-h-0 h-full" : "hidden"}>
          <div className="h-full min-h-0 flex flex-col gap-4">
            <div className="shrink-0">
              <p className="text-sm text-[#666]">
                External endpoints require <code>x-api-key: &lt;your_generated_key&gt;</code> and use <code>application/json</code>.
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ExternalApiSwagger />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
