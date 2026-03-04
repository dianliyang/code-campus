import LandingNavbar from "@/components/layout/LandingNavbar";
import LandingFooter from "@/components/layout/LandingFooter";
import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { ArrowRight, Brain, Wrench, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Button } from "@/components/ui/button";import { Card } from "@/components/ui/card";

export const revalidate = 60;

export default async function Home() {
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  const featureCards = [
  {
    icon: Zap,
    title: dict.features.universal_index.title,
    description: dict.features.universal_index.desc
  },
  {
    icon: Wrench,
    title: dict.features.progress_analytics.title,
    description: dict.features.progress_analytics.desc
  },
  {
    icon: Brain,
    title: dict.features.gap_analysis.title,
    description: dict.features.gap_analysis.desc
  }];


  const curriculumItems = [
  {
    number: "01",
    title: dict.features.universal_index.title,
    description: dict.features.universal_index.desc,
    tag: "Catalog"
  },
  {
    number: "02",
    title: dict.features.progress_analytics.title,
    description: dict.features.progress_analytics.desc,
    tag: "Progress"
  },
  {
    number: "03",
    title: dict.features.gap_analysis.title,
    description: dict.features.gap_analysis.desc,
    tag: "Planning"
  },
  {
    number: "04",
    title: dict.mission.label,
    description: dict.mission.desc_1,
    tag: "Overview"
  }];


  const universities = ["MIT", "Stanford", "UC Berkeley", "CMU"] as const;

  return (
    <div className="flex flex-col bg-white text-slate-900">
      <LandingNavbar dict={dict.navbar} />

      <header id="hero" className="pt-28 pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <Badge variant="outline" className="mb-7 bg-slate-100 border-slate-200 text-slate-600 px-3 py-1 text-xs">
            {dict.hero.system_status}
          </Badge>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.04] mb-6 bg-gradient-to-br from-slate-950 to-slate-500 bg-clip-text text-transparent">
            {dict.hero.title_prefix}
            <br />
            {dict.hero.title_highlight} {dict.hero.title_suffix}
          </h1>

          <p className="max-w-2xl text-lg text-slate-600 leading-relaxed mb-8">
            {dict.hero.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/courses">
                {dict.hero.cta}
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="#features">View Curriculum</Link>
            </Button>
          </div>
        </div>
      </header>

      <Card id="mission">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">{dict.mission.label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureCards.map((feature) =>
            <Card
              key={feature.title}>
              
              
                <feature.icon className="w-5 h-5 text-slate-700 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </Card>
            )}
          </div>
        </div>
      </Card>

      <Card id="features">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">The Curriculum</h2>
          <div>
            {curriculumItems.map((item) =>
            <Card
              key={item.number}>
              
              
                <div className="flex gap-4 sm:gap-6">
                  <span className="font-mono text-sm text-slate-400">{item.number}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 max-w-2xl">{item.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit border-slate-300 px-2 py-1 text-xs text-slate-600">
                  {item.tag}
                </Badge>
              </Card>
            )}
          </div>
        </div>
      </Card>

      <Card id="universities">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-medium tracking-wide uppercase text-slate-500 mb-10">
            {dict.universities.label}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {universities.map((uni) =>
            <UniversityIcon key={uni} name={uni} size={48} className="grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition-all duration-300" />
            )}
          </div>
        </div>
      </Card>

      <LandingFooter dict={dict.footer} lang={lang} />
    </div>);

}