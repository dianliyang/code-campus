"use client";

import { useEffect, useRef, useState } from "react";
import AISettingsCard from "./AISettingsCard";
import SecurityIdentitySection from "./SecurityIdentitySection";
import SystemMaintenanceCard from "./SystemMaintenanceCard";
import { User } from "@supabase/supabase-js";
import { Brain, Shield, Database } from "lucide-react";

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
}

const NAV_ITEMS = [
  { id: "intelligence", label: "Intelligence", icon: Brain },
  { id: "security",     label: "Security",     icon: Shield },
  { id: "maintenance",  label: "System",        icon: Database },
] as const;

export default function SettingsContainer({ user, profile }: SettingsContainerProps) {
  const [activeSection, setActiveSection] = useState<string>("intelligence");
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollContainerRef.current = document.getElementById("dashboard-scroll");
    const root = scrollContainerRef.current;

    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - container.getBoundingClientRect().top + container.scrollTop - 16;
    container.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="sm:flex sm:gap-4 sm:items-start pb-2">

      {/* Sub-sidebar — desktop only */}
      <aside className="hidden sm:block w-[148px] shrink-0 sticky top-0 self-start">
        <nav className="space-y-0.5 pt-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left ${
                activeSection === id
                  ? "bg-[#e7e7e7] text-[#1f1f1f]"
                  : "text-[#767676] hover:text-[#2a2a2a] hover:bg-[#ededed]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-4">
        <div id="intelligence" className="space-y-2">
          <header className="space-y-1">
            <h3 className="text-base font-semibold text-[#1f1f1f]">Intelligence Preference</h3>
            <p className="text-xs text-[#7a7a7a]">Configure AI providers and prompt behavioral patterns.</p>
          </header>

          <AISettingsCard
            key={profile ? JSON.stringify(profile) : "default-ai"}
            initialProvider={(profile?.ai_provider as string) || "perplexity"}
            initialModel={(profile?.ai_default_model as string) || "sonar"}
            initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
            initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
            initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
            initialTopicsPromptTemplate={(profile?.ai_topics_prompt_template as string) || ""}
            initialCourseUpdatePromptTemplate={(profile?.ai_course_update_prompt_template as string) || ""}
          />
        </div>

        <div id="security" className="space-y-2">
          <header className="space-y-1">
            <h3 className="text-base font-semibold text-[#1f1f1f]">Identity & Security</h3>
            <p className="text-xs text-[#7a7a7a]">Manage account access, authentication, and privacy.</p>
          </header>

          <SecurityIdentitySection key="security-section" provider={user.app_metadata.provider} />
        </div>

        <div id="maintenance" className="space-y-2">
          <header className="space-y-1">
            <h3 className="text-base font-semibold text-[#1f1f1f]">System Operations</h3>
            <p className="text-xs text-[#7a7a7a]">Synchronize academic catalogs and manage data integrity.</p>
          </header>
          <SystemMaintenanceCard key="maintenance-section" />
        </div>
      </div>
    </div>
  );
}
