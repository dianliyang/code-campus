import Link from "next/link";
import Image from "next/image";
import { getUser } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function Navbar({ dict }: { dict?: any }) {
  const user = await getUser();

  return (
    <nav className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative w-10 h-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">
                <Image 
                  src="/code-campus-logo.svg" 
                  alt="CodeCampus" 
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="text-xl font-black tracking-tighter text-gray-900 uppercase leading-none">CodeCampus</span>
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.3em] opacity-80 group-hover:opacity-100 transition-opacity">
                  {dict?.global_network || "Beta Catalog"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-12">
            <NavLinks dict={dict} />
            
            <div className="flex items-center pl-8 border-l border-slate-100 h-10">
                <Link href="/profile" className="flex items-center gap-4 group">
                  <div className="hidden sm:flex flex-col items-end -space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || dict?.guest_user || "Guest User"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[9px] font-black text-brand-green uppercase tracking-[0.2em]">{dict?.status_active || "Active"}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white border border-slate-800 shadow-lg group-hover:bg-brand-blue group-hover:border-brand-blue transition-all duration-300">
                    <i className="fa-solid fa-user text-sm"></i>
                  </div>
                </Link>
                {user && (
                  <div className="ml-6">
                     <LogoutButton />
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
