"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { LogOut, Power } from "lucide-react";

interface LogoutButtonProps {
  showLabel?: boolean;
  dict?: Dictionary;
  fullWidth?: boolean;
}

export default function LogoutButton({ showLabel, dict, fullWidth }: LogoutButtonProps) {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  if (showLabel) {
    return (
      <button 
        onClick={handleLogout}
        className={`inline-flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-all group ${fullWidth ? 'w-full justify-center bg-red-50/50 rounded-xl' : ''}`}
      >
        <LogOut className="w-4 h-4 transition-colors group-hover:text-red-500" />
        <span className="text-xs font-bold uppercase tracking-wide">{dict?.dashboard.profile.sign_out || "Sign Out"}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={handleLogout}
      className="text-gray-300 hover:text-red-500 transition-colors cursor-pointer p-2"
    >
      <Power className="w-4 h-4" />
    </button>
  );
}
