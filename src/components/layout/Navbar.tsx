import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const session = await auth();
  const navLinks = ["Courses", "Study Roadmap", "My Profile"];

  return (
    <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-3">
              <Image 
                src="/code-campus-logo.svg" 
                alt="CodeCampus" 
                width={40} 
                height={40} 
                className="w-10 h-10 transition-transform group-hover:rotate-6"
              />
              <div className="flex flex-col -space-y-1.5">
                <span className="text-xl font-black tracking-tighter text-gray-900 uppercase">CodeCampus</span>
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-[0.3em]">Network_v1.0</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-12">
            <div className="hidden lg:flex items-center gap-10">
              {navLinks.map((item) => {
                const href = item === "Courses" ? "/courses" : item === "Study Roadmap" ? "/study-plan" : "/profile";
                return (
                  <Link key={item} href={href} className="group flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-gray-900 transition-colors">
                      {item}
                    </span>
                    <div className="h-0.5 w-0 group-hover:w-4 bg-brand-blue mt-1 transition-all duration-300 rounded-full"></div>
                  </Link>
                );
              })}
            </div>
            
            {session ? (
              <div className="flex items-center gap-8 pl-10 border-l border-gray-100">
                <Link href="/profile" className="flex items-center gap-4 group">
                  <div className="hidden sm:flex flex-col items-end -space-y-1">
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{session.user?.name || "Scholar"}</span>
                    <span className="text-[9px] font-bold text-brand-green uppercase tracking-widest">Online</span>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-200 group-hover:border-brand-blue group-hover:text-brand-blue transition-all">
                    <i className="fa-solid fa-user-shield text-sm"></i>
                  </div>
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-4 pl-10 border-l border-gray-100 group">
                <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center text-white border border-gray-900 group-hover:bg-brand-blue group-hover:border-brand-blue transition-all">
                  <i className="fa-solid fa-right-to-bracket text-xs"></i>
                </div>
                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest group-hover:text-brand-blue transition-colors">Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
