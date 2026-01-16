import LandingNavbar from "@/components/layout/LandingNavbar";
import UniversityLogos from "@/components/home/UniversityLogos";
import Features from "@/components/home/Features";
import Mission from "@/components/home/Mission";
import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import HeroBackground from "@/components/home/HeroBackground";

export const revalidate = 60;

export default async function Home() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col bg-white">
      <LandingNavbar dict={dict.navbar} />
      
      {/* SECTION 1: RADICAL HERO - LIGHT THEME */}
      <div id="hero" className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-slate-50">
        <HeroBackground />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm backdrop-blur-md mb-12 animate-[float_6s_ease-in-out_infinite]">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-[0.2em]">{dict.hero.system_status}</span>
          </div>

          {/* Bold Title */}
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter uppercase mb-10 leading-[0.9] perspective-1000">
            <span className="block opacity-0 animate-[fadeUp_0.8s_ease-out_0.1s_forwards]">{dict.hero.title_prefix}</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-500 opacity-0 animate-[fadeUp_0.8s_ease-out_0.3s_forwards]">
              <span className="text-brand-blue">{dict.hero.title_highlight}</span> {dict.hero.title_suffix}
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-16 leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.6s_forwards] font-mono">
            {dict.hero.description}
          </p>

          <div className="flex justify-center opacity-0 animate-[fadeUp_0.8s_ease-out_0.8s_forwards]">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center gap-4 px-10 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-full hover:bg-brand-blue transition-all duration-300 shadow-xl shadow-slate-200 group"
            >
              {dict.hero.cta}
              <i className="fa-solid fa-arrow-right-long transition-transform group-hover:translate-x-1"></i>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Scroll to Explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-200"></div>
        </div>
      </div>

      {/* SECTION 2: MISSION */}
      <Mission dict={dict.mission} />

      {/* SECTION 3: ECOSYSTEM & FOOTER */}
      <div id="ecosystem" className="min-h-screen flex flex-col justify-center bg-white border-t border-slate-100 relative">
        <div className="flex-grow flex flex-col justify-center relative z-10">
           <div id="universities">
             <UniversityLogos dict={dict.universities} />
           </div>
           
           <div id="features">
             <Features dict={dict.features} />
           </div>
        </div>

        {/* Footer */}
        <div className="py-12 bg-slate-50 border-t border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-8">
            <div className="w-16 h-1 bg-slate-200 rounded-full"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              {dict.footer.copyright}
            </p>
            <LanguageSwitcher currentLang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
