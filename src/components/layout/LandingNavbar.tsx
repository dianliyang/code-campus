import Link from "next/link";
import Image from "next/image";

export default function LandingNavbar() {
  return (
    <nav className="bg-transparent absolute top-0 left-0 right-0 z-50 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/" className="group flex items-center gap-4">
              <Image 
                src="/code-campus-logo.svg" 
                alt="CodeCampus" 
                width={40} 
                height={40} 
                className="w-10 h-10 transition-transform group-hover:-rotate-6"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">CodeCampus</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.3em] group-hover:text-brand-blue transition-colors">Global Network</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-8 bg-white/80 backdrop-blur-md px-8 py-3 rounded-full border border-gray-100 shadow-sm">
            {[
              { name: "Mission", href: "#mission" },
              { name: "Universities", href: "#universities" },
              { name: "Curriculum", href: "#features" }
            ].map((item) => (
              <Link 
                key={item.name} 
                href={item.href} 
                className="group relative flex items-center justify-center px-4 py-2"
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
              className="hidden sm:inline-flex items-center gap-3 btn-primary shadow-lg shadow-gray-900/20"
            >
              Enter Network
              <i className="fa-solid fa-arrow-right-long"></i>
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}
