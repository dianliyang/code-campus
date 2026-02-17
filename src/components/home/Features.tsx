import { Layers, TrendingUp, Cpu, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Features({ dict }: { dict: any }) {
  const features: { icon: LucideIcon; title: string; description: string }[] = [
    {
      icon: Layers,
      title: dict.universal_index.title,
      description: dict.universal_index.desc,
    },
    {
      icon: TrendingUp,
      title: dict.progress_analytics.title,
      description: dict.progress_analytics.desc,
    },
    {
      icon: Cpu,
      title: dict.gap_analysis.title,
      description: dict.gap_analysis.desc,
    },
  ];

  return (
    <div className="py-20 sm:py-32 bg-slate-50 relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <Badge variant="outline" className="mb-4 text-slate-500">Features</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Everything you need to plan your studies
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, idx) => (
            <Card key={idx} className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-slate-200">
              <CardContent className="pt-6">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-5 transition-colors duration-300 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                  <feature.icon className="w-5 h-5" />
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
