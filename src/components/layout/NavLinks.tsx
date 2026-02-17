"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { Dictionary } from "@/lib/dictionary";
import { Info, Network, Layers, BookOpen, MapPin, UserCog, Dumbbell, Settings, type LucideIcon } from "lucide-react";

export default function NavLinks({ 
  variant = "light", 
  collapsed = false,
  dict,
  mode = "dashboard"
}: { 
  variant?: "light" | "dark", 
  collapsed?: boolean,
  dict: Dictionary['navbar'],
  mode?: "landing" | "dashboard"
}) {
  const pathname = usePathname();
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  
  const navLinks = useMemo((): { name: string; href: string; icon: LucideIcon }[] => {
    if (mode === "landing") {
      return [
        { name: dict?.mission || "Mission", href: "#mission", icon: Info },
        { name: dict?.universities || "Nodes", href: "#universities", icon: Network },
        { name: dict?.curriculum || "Protocol", href: "#features", icon: Layers }
      ];
    }
    return [
      { name: dict?.courses || "Courses", href: "/courses", icon: BookOpen },
      { name: dict?.roadmap || "Study Roadmap", href: "/study-plan", icon: MapPin },
      { name: dict?.workouts || "Workouts", href: "/workouts", icon: Dumbbell },
      { name: dict?.profile || "Profile", href: "/profile", icon: UserCog },
      { name: dict?.settings || "Settings", href: "/settings", icon: Settings }
    ];
  }, [mode, dict]);

  useEffect(() => {
    if (collapsed) return;
    
    const activeIdx = navLinks.findIndex(link => pathname === link.href);
    if (activeIdx !== -1 && linksRef.current[activeIdx] && navRef.current) {
      const activeLink = linksRef.current[activeIdx];
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink!.getBoundingClientRect();
      
      setIndicatorStyle({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
        opacity: 1
      });
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
    }
  }, [pathname, navLinks, collapsed]);

  const isDark = variant === "dark";

  return (
    <div 
      ref={navRef}
      className={`hidden lg:flex items-center relative transition-all duration-500 ${
        collapsed 
          ? 'gap-2 bg-transparent border-none' 
          : `gap-0.5 p-1 rounded-full border ${isDark ? 'bg-black/40 border-white/5 shadow-2xl' : 'bg-gray-50 border-slate-200/60'}`
      }`}
    >
      {/* Smooth Sliding Background Indicator */}
      {!collapsed && (
        <div 
          className={`absolute transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] rounded-full z-0 ${
            isDark ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-slate-900 shadow-lg shadow-slate-200'
          }`}
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            height: 'calc(100% - 8px)',
            opacity: indicatorStyle.opacity,
            top: '4px'
          }}
        />
      )}

      {navLinks.map((item, idx) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.name} 
            href={item.href}
            ref={(el) => { linksRef.current[idx] = el; }}
            className={`group relative flex items-center justify-center transition-all duration-500 z-10 ${
              collapsed 
                ? 'w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white' 
                : `px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] gap-2 ${
                    isActive 
                      ? (isDark ? 'text-gray-950' : 'text-white') 
                      : (isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
                  }`
            }`}
            title={collapsed ? item.name : undefined}
          >
            <item.icon className={`w-3 h-3 transition-all duration-500 ${
              isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
            }`} />
            
            <span className={`transition-all duration-500 overflow-hidden whitespace-nowrap ${
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[150px] opacity-100'
            }`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}