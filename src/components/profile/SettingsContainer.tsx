"use client";

import AISettingsCard from "./AISettingsCard";
import SecurityIdentitySection from "./SecurityIdentitySection";
import SystemMaintenanceCard from "./SystemMaintenanceCard";
import { User } from "@supabase/supabase-js";

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
}

export default function SettingsContainer({ user, profile }: SettingsContainerProps) {
  return (
    <div className="space-y-4 pb-2">
      <section id="intelligence" className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
        <header className="space-y-1">
          <h3 className="text-base font-semibold text-[#1f1f1f]">Intelligence Preference</h3>
          <p className="text-xs text-[#7a7a7a]">Configure AI providers and prompt behavioral patterns.</p>
        </header>
        
        <AISettingsCard
          key={profile ? JSON.stringify(profile) : 'default-ai'}
          initialProvider={(profile?.ai_provider as string) || "perplexity"}
          initialModel={(profile?.ai_default_model as string) || "sonar"}
          initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
          initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
          initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
          initialTopicsPromptTemplate={(profile?.ai_topics_prompt_template as string) || ""}
        />
      </section>

      <section id="security" className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
        <header className="space-y-1">
          <h3 className="text-base font-semibold text-[#1f1f1f]">Identity & Security</h3>
          <p className="text-xs text-[#7a7a7a]">Manage account access, authentication, and privacy.</p>
        </header>
        
        <SecurityIdentitySection 
          key="security-section"
          provider={user.app_metadata.provider} 
        />
      </section>

      <section id="maintenance" className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-3">
        <header className="space-y-1">
          <h3 className="text-base font-semibold text-[#1f1f1f]">System Operations</h3>
          <p className="text-xs text-[#7a7a7a]">Synchronize academic catalogs and manage data integrity.</p>
        </header>
        <SystemMaintenanceCard key="maintenance-section" />
      </section>
    </div>
  );
}
