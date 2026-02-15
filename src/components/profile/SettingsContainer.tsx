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
    <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
      {/* Universal Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar p-1 bg-gray-50 rounded-2xl border border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:w-full ${
                activeTab === tab.id 
                  ? "bg-white shadow-sm border border-gray-200 text-brand-blue" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-brand-blue" : "text-gray-400"}`} />
              <span className="text-xs font-bold uppercase tracking-wide">{tab.label}</span>
            </button>
          ))}
          <div className="hidden md:block my-4 mx-4 border-t border-gray-200"></div>
          <div className="hidden md:block">
            <LogoutButton showLabel={true} dict={dict} />
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <div className="flex-grow min-w-0">
        <div className="animate-in fade-in duration-300">
          {activeTab === "ai" && (
            <AISettingsCard
              initialProvider={(profile?.ai_provider as string) || "perplexity"}
              initialModel={(profile?.ai_default_model as string) || "sonar"}
              initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
              initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
              initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
            />
          )}
          {activeTab === "security" && (
            <SecurityIdentitySection dict={dict.dashboard.profile} provider={user.app_metadata.provider} />
          )}
          {activeTab === "maintenance" && (
            <SystemMaintenanceCard />
          )}
        </div>
        
        <div className="mt-8 md:hidden">
           <LogoutButton showLabel={true} dict={dict} fullWidth={true} />
        </div>
      </div>
    </div>
  );
}
