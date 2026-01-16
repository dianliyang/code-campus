"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ 
  variant = "light", 
  collapsed = false,
  dict
}: { 
  variant?: "light" | "dark", 
  collapsed?: boolean,
  dict?: any
}) {
  const pathname = usePathname();
  const navLinks = [
    { name: dict?.mission || "Mission", href: "#mission", icon: "fa-solid fa-shuttle-space" },
    { name: dict?.universities || "Nodes", href: "#universities", icon: "fa-solid fa-building-columns" },
    { name: dict?.curriculum || "Protocol", href: "#features", icon: "fa-solid fa-layer-group" }
  ];

  const isDark = variant === "dark";

  return (
    <div className={`hidden lg:flex items-center transition-all duration-500 ${
      collapsed 
        ? 'gap-2 bg-transparent border-none' 
        : `gap-1 p-1.5 rounded-full border ${isDark ? 'bg-black/40 border-white/5 shadow-2xl' : 'bg-gray-100/80 border-gray-200/50'}`
    }`}>
      {navLinks.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.name} 
            href={item.href} 
            className={`group relative flex items-center justify-center transition-all duration-500 ${
              collapsed 
                ? 'w-10 h-10 rounded-full hover:bg-white/10 text-gray-400 hover:text-white' 
                : `px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] ${
                    isActive 
                      ? (isDark ? 'bg-white text-gray-950 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]') 
                      : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-white/50')
                  }`
            }`}
            title={collapsed ? item.name : undefined}
          >
            <i className={`${item.icon} text-sm transition-all duration-500 group-hover:scale-110 ${
              collapsed ? '' : 'hidden'
            }`}></i>
            
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
