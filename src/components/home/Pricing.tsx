import Link from "next/link";
import { Check, Plus } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Pricing({ dict }: { dict: any }) {
  return (
    <div id="pricing" className="py-32 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.2em] mb-4 block">
            {dict.label}
          </span>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-6">
            {dict.title_prefix} <span className="text-brand-blue">{dict.title_highlight}</span>.
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            {dict.desc}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto px-4">
          
          {/* Free Tier */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-sm flex flex-col hover:shadow-xl transition-all duration-500 lg:my-8 group relative overflow-hidden">
            <div className="mb-10 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Tier 01</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{dict.free.name}</h3>
              
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-5xl font-semibold text-slate-900 tracking-tight">{dict.free.price}</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">/ forever</span>
              </div>
              
              <p className="text-[13px] text-slate-500 leading-relaxed min-h-[40px]">{dict.free.desc}</p>
            </div>
            
            <div className="flex-grow space-y-6 relative z-10 border-t border-slate-50 pt-8">
              <ul className="space-y-4">
                {dict.free.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <Check className="w-3 h-3 text-slate-300" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 relative z-10">
              <Link 
                href="/courses" 
                className="w-full py-3.5 px-6 rounded-xl border border-slate-200 bg-white text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-900 hover:text-slate-900 transition-all text-center flex items-center justify-center group"
              >
                {dict.free.cta}
              </Link>
            </div>
          </div>

          {/* Pro Tier (RECOMMENDED) */}
          <div className="bg-white rounded-[2.5rem] p-10 md:p-12 border border-brand-blue/20 shadow-md flex flex-col relative z-20 transition-all duration-500 transform hover:scale-[1.01] hover:shadow-xl hover:border-brand-blue/40">
            {/* Overlapping Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
              <div className="px-6 py-2 bg-brand-blue text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-md border-2 border-white">
                Most Popular
              </div>
            </div>

            <div className="mb-10 relative z-10">
              <span className="text-[10px] font-bold text-brand-blue uppercase tracking-[0.2em] mb-4 block">Tier 02</span>
              <h3 className="text-3xl font-bold text-slate-900 mb-6">{dict.pro.name}</h3>
              
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-5xl font-semibold text-slate-900 tracking-tight">{dict.pro.price}</span>
                <span className="text-slate-400 text-xs font-semibold">{dict.pro.period}</span>
              </div>

              <p className="text-[14px] text-slate-600 leading-relaxed min-h-[40px] font-medium">{dict.pro.desc}</p>
            </div>
            
            <div className="flex-grow space-y-6 relative z-10 border-t border-slate-50 pt-8">
              <ul className="space-y-5">
                {dict.pro.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-4 text-[14px] text-slate-800 font-semibold group/item">
                    <div className="w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center transition-transform group-hover/item:scale-110 shrink-0">
                      <Check className="w-3 h-3 text-brand-blue" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 relative z-10">
              <button className="w-full py-4 px-8 rounded-xl bg-slate-900 text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-brand-blue transition-all shadow-md flex items-center justify-center group overflow-hidden active:shadow-inner">
                <span className="relative z-10">{dict.pro.cta}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </div>
          </div>

          {/* Elite Tier */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-slate-100 shadow-sm flex flex-col hover:border-slate-300 transition-all duration-500 lg:my-8 group relative overflow-hidden">
            <div className="mb-10 relative z-10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 block">Tier 03</span>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{dict.elite.name}</h3>
              
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-5xl font-semibold text-slate-900 tracking-tight">{dict.elite.price}</span>
                <span className="text-slate-400 text-xs font-semibold">{dict.elite.period}</span>
              </div>

              <p className="text-[13px] text-slate-500 leading-relaxed min-h-[40px]">{dict.elite.desc}</p>
            </div>
            
            <div className="flex-grow space-y-6 relative z-10 border-t border-slate-50 pt-8">
              <ul className="space-y-4">
                {dict.elite.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <Plus className="w-3 h-3 text-slate-400" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 relative z-10">
              <button className="w-full py-3.5 px-6 rounded-xl border border-slate-200 bg-white text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-900 hover:text-slate-900 transition-all text-center flex items-center justify-center group active:shadow-inner">
                {dict.elite.cta}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
