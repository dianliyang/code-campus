import LandingNavbar from "@/components/layout/LandingNavbar";
import UniversityLogos from "@/components/home/UniversityLogos";
import Features from "@/components/home/Features";
import Mission from "@/components/home/Mission";
import LandingFooter from "@/components/layout/LandingFooter";
import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import HeroGridBackground from "@/components/home/HeroGridBackground";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default async function Home() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col bg-white">
      <LandingNavbar dict={dict.navbar} />

      {/* SECTION 1: HERO */}
      <div id="hero" className="min-h-screen flex flex-col justify-center relative overflow-hidden bg-white">
        <HeroGridBackground />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 pt-20">
          {/* Status Badge */}
          <div className="mb-12 opacity-0 animate-[fadeUp_0.8s_ease-out_forwards]">
            <Badge variant="outline" className="px-4 py-1.5 text-xs font-medium text-slate-500 border-slate-200 bg-white shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse mr-2 inline-block" />
              {dict.hero.system_status}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-slate-900 tracking-tight mb-6 sm:mb-10 leading-[1.1]">
            <span className="block opacity-0 animate-[fadeUp_0.8s_ease-out_forwards]">{dict.hero.title_prefix}</span>
            <span className="block opacity-0 animate-[fadeUp_0.8s_ease-out_0.1s_forwards]">
              <span className="text-brand-blue">{dict.hero.title_highlight}</span> {dict.hero.title_suffix}
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-10 sm:mb-16 leading-relaxed opacity-0 animate-[fadeUp_0.8s_ease-out_0.3s_forwards] px-4 sm:px-0">
            {dict.hero.description}
          </p>

          <div className="flex justify-center opacity-0 animate-[fadeUp_0.8s_ease-out_0.5s_forwards] px-6">
            <Button size="lg" className="rounded-full gap-2 shadow-lg" asChild>
              <Link href="/courses">
                {dict.hero.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
          <div className="w-px h-12 bg-gradient-to-b from-slate-200 via-slate-400 to-slate-200"></div>
        </div>
      </div>

      {/* SECTION 2: MISSION */}
      <Mission dict={dict.mission} />

      {/* SECTION 3: UNIVERSITIES */}
      <div id="universities">
        <UniversityLogos dict={dict.universities} />
      </div>

      {/* SECTION 4: FEATURES */}
      <div id="features">
        <Features dict={dict.features} />
      </div>

      {/* Footer */}
      <LandingFooter dict={dict.footer} lang={lang} />
    </div>
  );
}
