"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { LogOut, Power } from "lucide-react";

interface LogoutButtonProps {
  showLabel?: boolean;
  dict?: Dictionary;
}

export default function LogoutButton({ showLabel, dict }: LogoutButtonProps) {
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
        className="flex items-center gap-2 btn-secondary px-6 py-2.5 w-full hover:border-red-200 hover:text-red-500"
      >
        <LogOut className="w-3 h-3" />
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
