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
      
      {/* SECTION 1: RADICAL HERO */}
      <div id="hero" className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-gray-950">
        <HeroBackground />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          {/* Cyber Status Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 backdrop-blur-md mb-12 animate-[float_6s_ease-in-out_infinite]">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold text-brand-blue uppercase tracking-[0.2em]">{dict.hero.system_status}</span>
          </div>

          {/* Glitch Title */}
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-10 leading-[0.9] perspective-1000 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <span className="block opacity-0 animate-[fadeUp_0.8s_ease-out_0.1s_forwards]">{dict.hero.title_prefix}</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 opacity-0 animate-[fadeUp_0.8s_ease-out_0.3s_forwards]">
              <span className="text-brand-blue">{dict.hero.title_highlight}</span> {dict.hero.title_suffix}
            </span>
          </h1>

          {/* Data Description */}
          <p className="text-lg md:text-xl text-gray-400 font-medium max-w-2xl mx-auto mb-16 leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.6s_forwards] font-mono">
            {dict.hero.description}
          </p>

          <div className="flex justify-center opacity-0 animate-[fadeUp_0.8s_ease-out_0.8s_forwards]">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center gap-4 px-10 py-4 bg-white text-gray-950 text-xs font-black uppercase tracking-[0.2em] rounded-full hover:bg-brand-blue hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] group"
            >
              {dict.hero.cta}
              <i className="fa-solid fa-arrow-right-long transition-transform group-hover:translate-x-1"></i>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
          <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Scroll to Initialize</span>
          <div className="w-px h-12 bg-gradient-to-b from-brand-blue/0 via-brand-blue/50 to-brand-blue/0"></div>
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
