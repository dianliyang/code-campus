"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { LogOut, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  showLabel?: boolean;
  dict?: Dictionary;
  fullWidth?: boolean;
  className?: string;
}

export default function LogoutButton({ showLabel, dict, fullWidth, className }: LogoutButtonProps) {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  if (showLabel) {
    return (
      <Button variant="outline" onClick={handleLogout} type="button">
        <LogOut className="transition-colors group-hover:text-red-600" />
        <span>{dict?.dashboard.profile.sign_out || "Sign Out"}</span>
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" onClick={handleLogout} type="button">
      <Power />
    </Button>
  );
}
