import Link from "next/link";

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4 items-stretch max-w-6xl mx-auto px-4">
          
          {/* Free Tier */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-100 shadow-sm flex flex-col hover:shadow-xl hover:border-slate-200 transition-all duration-500 lg:my-8">
            <div className="mb-10">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 block">Tier 01</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{dict.free.name}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-8 h-12">{dict.free.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">{dict.free.price}</span>
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">/ Free</span>
              </div>
            </div>
            
            <div className="flex-grow space-y-6 border-t border-slate-50 pt-10">
              <ul className="space-y-4">
                {dict.free.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-slate-600 font-medium">
                    <i className="fa-solid fa-check text-slate-300 text-[10px]"></i>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <Link 
                href="/courses" 
                className="w-full py-4 px-6 rounded-xl border-2 border-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-200 hover:text-slate-900 transition-all text-center flex items-center justify-center group"
              >
                {dict.free.cta}
                <i className="fa-solid fa-arrow-right ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"></i>
              </Link>
            </div>
          </div>

          {/* Pro Tier (RECOMMENDED) */}
          <div className="bg-white rounded-[2rem] p-10 md:p-12 border-2 border-brand-blue shadow-[0_30px_70px_rgba(59,130,246,0.15)] flex flex-col relative z-10 transition-all duration-500 transform hover:scale-[1.02]">
            <div className="absolute top-6 right-8">
              <div className="px-4 py-1.5 bg-brand-blue text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-brand-blue/30 animate-pulse">
                Best Value
              </div>
            </div>
            
            <div className="mb-10">
              <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] mb-6 block">Tier 02</span>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{dict.pro.name}</h3>
              <p className="text-[14px] text-slate-600 leading-relaxed font-semibold mb-8 h-12">{dict.pro.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">{dict.pro.price}</span>
                <span className="text-slate-400 text-base font-black uppercase tracking-widest">{dict.pro.period}</span>
              </div>
            </div>
            
            <div className="flex-grow space-y-6 border-t border-brand-blue/10 pt-10">
              <ul className="space-y-5">
                {dict.pro.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-4 text-[14px] text-slate-800 font-bold">
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/20">
                      <i className="fa-solid fa-check text-white text-[10px]"></i>
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12">
              <button className="w-full py-5 px-8 rounded-2xl bg-brand-blue text-white text-[12px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-blue/30 flex items-center justify-center group">
                {dict.pro.cta}
                <i className="fa-solid fa-bolt-lightning ml-3 animate-bounce"></i>
              </button>
            </div>
          </div>

          {/* Elite Tier */}
          <div className="bg-slate-900 rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:my-8 group">
            {/* Glossy Overlay */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-50"></div>
            
            <div className="mb-10 relative z-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 block text-slate-500">Tier 03</span>
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">{dict.elite.name}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed font-medium mb-8 h-12">{dict.elite.desc}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white tracking-tighter">{dict.elite.price}</span>
                <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">{dict.elite.period}</span>
              </div>
            </div>
            
            <div className="flex-grow space-y-6 border-t border-white/5 pt-10 relative z-10">
              <ul className="space-y-4">
                {dict.elite.features.map((feat: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-slate-300 font-medium">
                    <i className="fa-solid fa-plus text-slate-500 text-[10px]"></i>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-12 relative z-10">
              <button className="w-full py-4 px-6 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-slate-900 transition-all text-center flex items-center justify-center group">
                {dict.elite.cta}
                <i className="fa-solid fa-crown ml-2 opacity-0 group-hover:opacity-100 transition-all text-amber-400"></i>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}