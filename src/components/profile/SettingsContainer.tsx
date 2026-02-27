"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { User } from "@supabase/supabase-js";
import { LucideIcon, Cpu, FileCode, CalendarDays, Tag, Search, BarChart2, Shield, UserX, Database, Sparkles, BookOpen } from "lucide-react";

const AISettingsCard = dynamic(() => import("./AISettingsCard"), { ssr: false });
const SecurityIdentitySection = dynamic(() => import("./SecurityIdentitySection"), { ssr: false });
const SystemMaintenanceCard = dynamic(() => import("./SystemMaintenanceCard"), { ssr: false });

export type SectionId =
  | "engine" | "metadata" | "scheduling" | "study-planner" | "topics" | "course-update" | "syllabus-retrieve" | "course-intel" | "usage"
  | "identity" | "account"
  | "sync";

type NavItem = { id: SectionId; label: string; icon: LucideIcon };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Intelligence",
    items: [
      { id: "engine",        label: "Engine Configuration", icon: Cpu },
      { id: "metadata",      label: "Metadata Logic",       icon: FileCode },
      { id: "scheduling",    label: "Scheduling Logic",     icon: CalendarDays },
      { id: "study-planner", label: "Study Planner Logic",  icon: Sparkles },
      { id: "topics",        label: "Topic Classification", icon: Tag },
      { id: "course-update",     label: "Course Update Search", icon: Search },
      { id: "syllabus-retrieve", label: "Syllabus Retrieve",    icon: BookOpen },
      { id: "course-intel",      label: "Course Intel",         icon: Sparkles },
      { id: "usage",             label: "Usage Statistics",     icon: BarChart2 },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "identity", label: "Identity & Security", icon: Shield },
      { id: "account",  label: "Account",             icon: UserX },
    ],
  },
  {
    label: "System",
    items: [
      { id: "sync", label: "Data Synchronization", icon: Database },
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
  "topics":        { title: "Topic Classification",   desc: "Prompt template for topic tagging." },
  "course-update":     { title: "Course Update Search",   desc: "Prompt template for web search queries." },
  "syllabus-retrieve": { title: "Syllabus Retrieve Logic", desc: "Prompt template for syllabus retrieval." },
  "course-intel":      { title: "Course Intel Logic",      desc: "Merged prompt for resources, syllabus, and assignments retrieval." },
  "usage":             { title: "Usage Statistics",       desc: "AI call history, token usage, and cost breakdown." },
  "identity":      { title: "Identity & Security",    desc: "Authentication provider and account status." },
  "account":       { title: "Account",                desc: "Danger zone — irreversible operations." },
  "sync":          { title: "Data Synchronization",   desc: "Synchronize course catalogs from institution scrapers." },
};

const AI_SECTIONS: SectionId[] = ["engine", "metadata", "scheduling", "study-planner", "topics", "course-update", "syllabus-retrieve", "course-intel", "usage"];

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
  aiDefaults: {
    modelCatalog: { perplexity: string[]; gemini: string[]; openai: string[] };
  };
}

export default function SettingsContainer({ user, profile, aiDefaults }: SettingsContainerProps) {
  const [active, setActive] = useState<SectionId>(() => {
    if (typeof window === "undefined") return "engine";
    try {
      const saved = window.localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
      if (saved && ALL_ITEMS.some((item) => item.id === saved)) {
        return saved as SectionId;
      }
    } catch {
      // Ignore storage access errors.
    }
    return "engine";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, active);
    } catch {
      // Ignore storage access errors.
    }
  }, [active]);

  const meta = SECTION_META[active];

  return (
    <div className="flex h-full gap-0">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden sm:flex flex-col w-[200px] shrink-0 h-full overflow-y-auto border-r border-[#f0f0f0] pr-2 py-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 mb-1 text-[10px] font-bold text-[#bbb] uppercase tracking-widest">
              {group.label}
            </p>
            {group.items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
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

      {/* ── Content panel ── */}
      <div className="flex-1 min-w-0 h-full flex flex-col sm:pl-5 pb-4">

        {/* Mobile nav — horizontal scrollable pills */}
        <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar shrink-0">
          {ALL_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                active === id
                  ? "bg-[#1f1f1f] text-white border-[#1f1f1f]"
                  : "bg-white text-[#666] border-[#d8d8d8] hover:bg-[#f5f5f5]"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Section header */}
        <div className="mb-3 shrink-0">
          <h3 className="text-base font-semibold text-[#1f1f1f]">{meta.title}</h3>
          <p className="text-xs text-[#7a7a7a] mt-0.5">{meta.desc}</p>
        </div>

        {AI_SECTIONS.includes(active) ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <AISettingsCard
              key={`${active}-${profile ? JSON.stringify(profile) : "default-ai"}`}
              section={active as "engine" | "metadata" | "scheduling" | "study-planner" | "topics" | "course-update" | "syllabus-retrieve" | "course-intel" | "usage"}
              initialProvider={(profile?.ai_provider as string) || "perplexity"}
              initialModel={(profile?.ai_default_model as string) || aiDefaults.modelCatalog.perplexity[0] || aiDefaults.modelCatalog.openai[0] || ""}
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

        {/* Identity & Security */}
        <div className={active === "identity" ? "flex-1 min-h-0" : "hidden"}>
          <SecurityIdentitySection view="identity" provider={user.app_metadata.provider} />
        </div>

        {/* Account / Danger Zone */}
        <div className={active === "account" ? "flex-1 min-h-0" : "hidden"}>
          <SecurityIdentitySection view="account" provider={user.app_metadata.provider} />
        </div>

        {/* Data Synchronization */}
        <div className={active === "sync" ? "flex-1 min-h-0" : "hidden"}>
          <SystemMaintenanceCard />
        </div>
      </div>
    </div>
  );
}
