"use client";

import { Github, ShieldCheck, Link2, LucideIcon } from "lucide-react";
import type { Dictionary } from "@/lib/dictionary";
import DeleteAccount from "@/components/profile/DeleteAccount";

interface SecurityIdentitySectionProps {
  dict: Dictionary["dashboard"]["profile"];
  provider?: string;
}

interface IdentityCardProps {
  title: string;
  desc: string;
  icon: LucideIcon | null;
  isConnected: boolean;
  colorClass: string;
  isSvg?: boolean;
  svgPath?: string;
  connectedLabel: string;
  linkAccountLabel: string;
}

function IdentityCard({ 
  title, 
  desc, 
  icon: Icon, 
  isConnected, 
  colorClass,
  isSvg = false,
  svgPath = "",
  connectedLabel,
  linkAccountLabel
}: IdentityCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${colorClass}`}>
          {isSvg ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d={svgPath} />
            </svg>
          ) : (
            Icon && <Icon className="w-6 h-6" />
          )}
        </div>
        <div>
          <span className="block text-sm font-black uppercase tracking-tight text-gray-900 leading-none mb-1">{title}</span>
          <span className="text-[10px] font-medium text-gray-400 leading-none">{desc}</span>
        </div>
      </div>
      
      {isConnected ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-100 text-green-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">{connectedLabel}</span>
        </div>
      ) : (
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <Link2 className="w-3.5 h-3.5" />
          {linkAccountLabel}
        </button>
      )}
    </div>
  );
}

export default function SecurityIdentitySection({ dict, provider }: SecurityIdentitySectionProps) {
  if (!dict) return null;

  const isGithub = provider === "github";
  const isGoogle = provider === "google";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IdentityCard 
          title={dict.github_title}
          desc={dict.github_desc}
          icon={Github}
          isConnected={isGithub}
          colorClass="bg-gray-900"
          connectedLabel={dict.connected}
          linkAccountLabel={dict.link_account}
        />
        
        <IdentityCard 
          title={dict.google_title}
          desc={dict.google_desc}
          icon={null}
          isConnected={isGoogle}
          colorClass="bg-white border border-gray-100 !text-[#4285F4]"
          isSvg={true}
          svgPath="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          connectedLabel={dict.connected}
          linkAccountLabel={dict.link_account}
        />
      </div>

      <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-md">
          <h4 className="text-sm font-bold text-gray-900 mb-1">{dict.delete_title}</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {dict.delete_desc} This action is irreversible and will purge all personal data.
          </p>
        </div>
        <div className="flex-shrink-0">
          <DeleteAccount dict={dict} />
        </div>
      </div>
    </div>
  );
}
