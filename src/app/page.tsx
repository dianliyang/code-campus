import LandingNavbar from "@/components/layout/LandingNavbar";
import UniversityLogos from "@/components/home/UniversityLogos";
import Features from "@/components/home/Features";
import Mission from "@/components/home/Mission";
import Link from "next/link";

export const revalidate = 60;

export default function Home() {
  return (
    <div className="flex flex-col bg-white">
      <LandingNavbar />
      
      {/* SECTION 1: HERO */}
      <div id="hero" className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-white">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none select-none hidden lg:block">
          <div className="text-[15rem] font-black italic tracking-tighter leading-none">0xFC</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
            <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">System Initialized // v1.0.4</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase mb-8 leading-[0.95]">
            The Global <br />
            <span className="text-brand-blue">CS</span> Catalog<span className="text-brand-blue">.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-12 leading-relaxed">
            Analyze and explore computer science curricula from the world&apos;s leading universities through a unified, high-performance interface.
          </p>

          <div className="flex justify-center">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center gap-4 btn-primary group shadow-2xl shadow-brand-blue/20"
            >
              Explore the Catalog
              <i className="fa-solid fa-chevron-right text-[10px] transition-transform group-hover:translate-x-2"></i>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-300">
          <i className="fa-solid fa-arrow-down"></i>
        </div>
      </div>

      {/* SECTION 2: MISSION */}
      <Mission />

      {/* SECTION 3: ECOSYSTEM & FOOTER */}
      <div id="ecosystem" className="min-h-screen flex flex-col justify-center bg-gray-50 border-t border-gray-200">
        <div className="flex-grow flex flex-col justify-center">
           <div id="universities">
             <UniversityLogos />
           </div>
           
           <div id="features">
             <Features />
           </div>
        </div>

        {/* Footer */}
        <div className="py-12 bg-gray-50 border-t border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-16 h-1 bg-gray-200 mx-auto mb-8"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
              &copy; 2026 CodeCampus Global Network. Initialized 0xFC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
