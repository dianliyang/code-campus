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
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all active:scale-95 ${fullWidth ? 'w-full' : ''}`}
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>{dict?.dashboard.profile.sign_out || "Sign Out"}</span>
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
