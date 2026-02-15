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
    { id: "ai", label: "AI Config", icon: Bot },
    { id: "security", label: "Account", icon: Shield },
    { id: "maintenance", label: "System", icon: Wrench },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-12">
      {/* Universal Sidebar */}
      <aside className="w-full md:w-48 flex-shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar pb-4 md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md transition-all whitespace-nowrap md:w-full text-sm font-medium ${
                activeTab === tab.id 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/50"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-gray-900" : "text-gray-400"}`} />
              {tab.label}
            </button>
          ))}
          <div className="hidden md:block my-4 border-t border-gray-100"></div>
          <div className="hidden md:block px-3">
            <LogoutButton showLabel={true} dict={dict} />
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-grow max-w-2xl">
        <div className="animate-in fade-in duration-300">
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
        
        <div className="mt-12 md:hidden">
           <LogoutButton showLabel={true} dict={dict} fullWidth={true} />
        </div>
      </div>
    </div>
  );
}
