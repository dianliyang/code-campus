import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="bg-white/95 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.3em] opacity-80 group-hover:opacity-100 transition-opacity">Beta Catalog</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-12">
            <NavLinks />
            
            <div className="flex items-center pl-8 border-l border-gray-200 h-8">
                <Link href="/profile" className="flex items-center gap-3 group">
                  <div className="hidden sm:flex flex-col items-end -space-y-0.5">
                    <span className="text-[9px] font-black text-gray-900 uppercase tracking-tight">{session?.user?.name || "Guest Scholar"}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Online</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 border border-gray-200 shadow-sm group-hover:border-brand-blue/40 group-hover:text-brand-blue group-hover:shadow-md transition-all">
                    <i className="fa-solid fa-user text-sm"></i>
                  </div>
                </Link>
                {session && (
                  <div className="ml-4">
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
