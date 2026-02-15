"use client";

import AISettingsCard from "./AISettingsCard";
import SecurityIdentitySection from "./SecurityIdentitySection";
import SystemMaintenanceCard from "./SystemMaintenanceCard";
import { Dictionary } from "@/lib/dictionary";
import { User } from "@supabase/supabase-js";

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
  dict: Dictionary;
}

export default function SettingsContainer({ user, profile, dict }: SettingsContainerProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-24 pb-24">
      {/* 1. Intelligence Section */}
      <section id="intelligence">
        <header className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Intelligence Preference</h3>
          <p className="text-sm text-gray-500 font-mono">Configure AI providers and prompt behavioral patterns.</p>
        </header>
        
        <AISettingsCard
          key={profile ? JSON.stringify(profile) : 'default-ai'}
          initialProvider={(profile?.ai_provider as string) || "perplexity"}
          initialModel={(profile?.ai_default_model as string) || "sonar"}
          initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
          initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
          initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
        />
      </section>

      {/* 2. Identity & Security Section */}
      <section id="security" className="pt-12 border-t border-gray-100">
        <header className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Identity & Security</h3>
          <p className="text-sm text-gray-500 font-mono">Manage account access, authentication, and privacy.</p>
        </header>
        
        <SecurityIdentitySection 
          key="security-section"
          dict={dict.dashboard.profile} 
          provider={user.app_metadata.provider} 
        />
      </section>

      {/* 3. System Maintenance Section */}
      <SystemMaintenanceCard key="maintenance-section" />
    </div>
  );
}
