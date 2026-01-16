import Link from "next/link";
import Image from "next/image";
import FloatingNavWrapper from "./FloatingNavWrapper";

export default function LandingNavbar() {
  return (
    <FloatingNavWrapper initialClassName="w-full bg-transparent translate-y-0 border-b border-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-full min-h-[4rem] transition-all duration-500 py-3 md:py-4">
            
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="group flex items-center gap-3">
                <Image 
                  src="/code-campus-logo.svg" 
                  alt="CodeCampus" 
                  width={36} 
                  height={36} 
                  className="w-9 h-9 transition-transform group-hover:-rotate-6"
                />
                <div className="flex flex-col">
                  <span className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">CodeCampus</span>
                  <span className="hidden md:block text-xs font-bold text-gray-500 uppercase tracking-[0.3em] group-hover:text-brand-blue transition-colors">Global Network</span>
                </div>
              </Link>
            </div>

            {/* Navigation Links - Hidden on Mobile */}
            <div className="hidden lg:flex items-center gap-6 bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-gray-100 shadow-sm">
              {[
                { name: "Mission", href: "#mission" },
                { name: "Universities", href: "#universities" },
                { name: "Curriculum", href: "#features" }
              ].map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href} 
                  className="group relative flex items-center justify-center px-3 py-1.5"
                >
                  <span className="absolute left-0 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-brand-blue font-mono font-bold text-xs">&lt;</span>
                  
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-gray-900 transition-colors mx-2">
                    {item.name}
                  </span>
                  
                  <span className="absolute right-0 opacity-0 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-brand-blue font-mono font-bold text-xs">&gt;</span>
                </Link>
              ))}
            </div>

            {/* CTA Section */}
            <div className="flex items-center gap-6">
              <Link 
                href="/courses" 
                className="flex items-center gap-4 btn-primary group px-6 py-3"
              >
                Enter
                <i className="fa-solid fa-arrow-right-long transition-transform group-hover:translate-x-1"></i>
              </Link>
            </div>

          </div>
        </div>
    </FloatingNavWrapper>
  );
}
