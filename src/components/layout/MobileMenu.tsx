"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { Menu, X, BookOpen, MapPin, UserCog, LogOut, User } from "lucide-react";

interface MobileMenuProps {
  dict: Dictionary['navbar'];
  user: { name: string; email?: string } | null;
}

export default function MobileMenu({ dict, user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const navLinks = [
    { name: dict?.courses || "Courses", href: "/courses", icon: BookOpen },
    { name: dict?.roadmap || "Study Plan", href: "/study-plan", icon: MapPin },
    { name: dict?.profile || "Profile", href: "/profile", icon: UserCog },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.refresh();
    router.push("/login");
  };

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top duration-300">
            <div className="max-w-[1440px] mx-auto px-4 py-4">
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl mb-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black text-brand-green uppercase tracking-wider">
                      {dict?.status_active || "Active"}
                    </span>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                        isActive
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <link.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                      <span className="text-sm font-bold uppercase tracking-wider">{link.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Logout Button */}
              {user && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">
                      Sign Out
                    </span>
                  </button>
                </div>
              )}

              {/* Login Link for guests */}
              {!user && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-gray-900 text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
