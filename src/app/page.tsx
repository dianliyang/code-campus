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
        {/* Background Grid & Decor */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none select-none hidden lg:block animate-pulse-slow">
          <div className="text-[15rem] font-black italic tracking-tighter leading-none">0xFC</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          {/* System Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-gray-200/60 shadow-sm backdrop-blur-sm mb-10 hover:border-brand-blue/30 hover:shadow-md transition-all duration-500 cursor-default animate-[float_4s_ease-in-out_infinite]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{dict.hero.system_status}</span>
          </div>

          {/* Animated Title */}
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase mb-8 leading-[0.95] perspective-1000">
            <span className="inline-block opacity-0 animate-[fadeUp_0.8s_ease-out_0.1s_forwards]">{dict.hero.title_prefix}</span> <br />
            <span className="inline-block opacity-0 animate-[fadeUp_0.8s_ease-out_0.3s_forwards]"><span className="text-brand-blue">{dict.hero.title_highlight}</span> {dict.hero.title_suffix}<span className="text-brand-blue">.</span></span>
          </h1>

          {/* Animated Description */}
          <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-12 leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.6s_forwards]">
            {dict.hero.description}
          </p>

          <div className="flex justify-center opacity-0 animate-[fadeUp_0.8s_ease-out_0.8s_forwards]">
            <Link 
              href="/courses" 
              className="inline-flex items-center justify-center gap-5 btn-primary group relative overflow-hidden"
            >
              <span className="relative z-10">{dict.hero.cta}</span>
              <i className="fa-solid fa-chevron-right text-[9px] transition-transform group-hover:translate-x-1 relative z-10"></i>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </Link>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-300 opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
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
