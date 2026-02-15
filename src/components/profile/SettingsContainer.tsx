"use client";

import { useState } from "react";
import AISettingsCard from "./AISettingsCard";
import SecurityIdentitySection from "./SecurityIdentitySection";
import SystemMaintenanceCard from "./SystemMaintenanceCard";
import LogoutButton from "@/components/layout/LogoutButton";
import { Bot, Shield, Wrench } from "lucide-react";
import { Dictionary } from "@/lib/dictionary";
import { User } from "@supabase/supabase-js";

interface SettingsContainerProps {
  user: User;
  profile: Record<string, unknown> | null;
  dict: Dictionary;
}

type TabId = "ai" | "security" | "maintenance";

export default function SettingsContainer({ user, profile, dict }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ai");

  const tabs = [
    { id: "ai", label: "01_INTELLIGENCE", icon: Bot },
    { id: "security", label: "02_IDENTITY", icon: Shield },
    { id: "maintenance", label: "03_OPERATIONS", icon: Wrench },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-16">
      {/* Radical Sidebar */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] ml-4 mb-4 block italic">SELECT_PROTOCOL</span>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar pb-4 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`flex items-center gap-3 px-4 py-3 rounded-none transition-all whitespace-nowrap lg:w-full text-[10px] font-black uppercase tracking-widest border-l-2 ${
                  activeTab === tab.id 
                    ? "bg-gray-950 text-white border-brand-blue" 
                    : "text-gray-400 border-transparent hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? "text-brand-blue" : "text-gray-300"}`} />
                {tab.label}
              </button>
            ))}
            <div className="hidden lg:block my-8 border-t border-gray-100 mx-4"></div>
            <div className="hidden lg:block px-1">
              <LogoutButton showLabel={true} dict={dict} />
            </div>
          </nav>
        </div>
      </aside>

      {/* Content Area */}
      <div className="flex-grow min-w-0">
        <div className="animate-in fade-in duration-500">
          {activeTab === "ai" && (
            <div className="space-y-12">
              <AISettingsCard
                key={profile ? JSON.stringify(profile) : 'default-ai'}
                initialProvider={(profile?.ai_provider as string) || "perplexity"}
                initialModel={(profile?.ai_default_model as string) || "sonar"}
                initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
                initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
                initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
              />
            </div>
          )}
          {activeTab === "security" && (
            <SecurityIdentitySection 
              key="security-section"
              dict={dict.dashboard.profile} 
              provider={user.app_metadata.provider} 
            />
          )}
          {activeTab === "maintenance" && (
            <SystemMaintenanceCard key="maintenance-section" />
          )}
        </div>
        
        <div className="mt-16 lg:hidden">
           <LogoutButton showLabel={true} dict={dict} fullWidth={true} />
        </div>
      </div>
    </div>
  );
}
