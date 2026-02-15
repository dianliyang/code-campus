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
    { id: "ai", label: "Intelligence", icon: Bot },
    { id: "security", label: "Identity & Security", icon: Shield },
    { id: "maintenance", label: "System Operations", icon: Wrench },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar pb-4 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap lg:w-full text-sm font-medium ${
                activeTab === tab.id 
                  ? "bg-gray-100 text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-gray-900" : "text-gray-400"}`} />
              {tab.label}
            </button>
          ))}
          <div className="hidden lg:block my-6 border-t border-gray-100 mx-2"></div>
          <div className="hidden lg:block px-2">
            <LogoutButton showLabel={true} dict={dict} />
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-grow min-w-0">
        <div className="animate-in fade-in duration-300">
          {activeTab === "ai" && (
            <AISettingsCard
              key={profile ? JSON.stringify(profile) : 'default-ai'}
              initialProvider={(profile?.ai_provider as string) || "perplexity"}
              initialModel={(profile?.ai_default_model as string) || "sonar"}
              initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
              initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
              initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
            />
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
        
        <div className="mt-12 lg:hidden">
           <LogoutButton showLabel={true} dict={dict} fullWidth={true} />
        </div>
      </div>
    </div>
  );
}
