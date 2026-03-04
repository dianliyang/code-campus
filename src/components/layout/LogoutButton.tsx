"use client";

import { Dictionary } from "@/lib/dictionary";
import { cn } from "@/lib/utils";
import { LogOut, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  showLabel?: boolean;
  dict?: Dictionary;
  fullWidth?: boolean;
  className?: string;
}

export default function LogoutButton({ showLabel, dict, fullWidth, className }: LogoutButtonProps) {
  const handleLogout = async () => {
    window.location.assign("/auth/signout");
  };

  if (showLabel) {
    return (
      <Button
        variant="ghost"
        className={cn(fullWidth ? "w-full justify-start" : "", className)}
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="transition-colors group-hover:text-red-600" />
        <span>{dict?.dashboard.profile.sign_out || "Sign Out"}</span>
      </Button>
    );
  }

  return (
    <Button variant="outline" size="icon" className={className} onClick={handleLogout} type="button">
      <Power />
    </Button>
  );
}
