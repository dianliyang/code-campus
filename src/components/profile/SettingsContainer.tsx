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
    <div className="max-w-4xl space-y-16 pb-24">
      {/* 1. Intelligence Section */}
      <section id="intelligence" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Intelligence Preference</h3>
          <p className="text-sm text-gray-500">Configure AI providers and prompt behavioral patterns.</p>
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
      <section id="security" className="pt-16 border-t border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Identity & Security</h3>
          <p className="text-sm text-gray-500">Manage account access, authentication, and privacy.</p>
        </header>
        
        <SecurityIdentitySection 
          key="security-section"
          provider={user.app_metadata.provider} 
        />
      </section>

      {/* 3. System Maintenance Section */}
      <section id="maintenance" className="pt-16 border-t border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <header>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">System Operations</h3>
          <p className="text-sm text-gray-500">Synchronize academic catalogs and manage data integrity.</p>
        </header>
        <SystemMaintenanceCard key="maintenance-section" />
      </section>

    </div>
  );
}
