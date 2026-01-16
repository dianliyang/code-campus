import LandingNavbar from "@/components/layout/LandingNavbar";
import UniversityLogos from "@/components/home/UniversityLogos";
import Features from "@/components/home/Features";
import Mission from "@/components/home/Mission";
import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export const revalidate = 60;

export default async function Home() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col bg-white">
      <LandingNavbar dict={dict.navbar} />
      
      {/* SECTION 1: HERO */}
      <div id="hero" className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-white">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none select-none hidden lg:block">
          <div className="text-[15rem] font-black italic tracking-tighter leading-none">0xFC</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
            <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{dict.hero.system_status}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase mb-8 leading-[0.95]">
            {dict.hero.title_prefix} <br />
            <span className="text-brand-blue">{dict.hero.title_highlight}</span> {dict.hero.title_suffix}<span className="text-brand-blue">.</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-12 leading-relaxed">
            {dict.hero.description}
          </p>

          <div className="flex justify-center">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center gap-5 btn-primary group"
            >
              {dict.hero.cta}
              <i className="fa-solid fa-chevron-right text-[9px] transition-transform group-hover:translate-x-1"></i>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-300">
          <i className="fa-solid fa-arrow-down"></i>
        </div>
      </div>

      {/* SECTION 2: MISSION */}
      <Mission dict={dict.mission} />

      {/* SECTION 3: ECOSYSTEM & FOOTER */}
      <div id="ecosystem" className="min-h-screen flex flex-col justify-center bg-gray-50 border-t border-gray-200">
        <div className="flex-grow flex flex-col justify-center">
           <div id="universities">
             <UniversityLogos dict={dict.universities} />
           </div>
           
           <div id="features">
             <Features dict={dict.features} />
           </div>
        </div>

        {/* Footer */}
        <div className="py-12 bg-gray-50 border-t border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-8">
            <div className="w-16 h-1 bg-gray-200"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
              {dict.footer.copyright}
            </p>
            <LanguageSwitcher currentLang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
