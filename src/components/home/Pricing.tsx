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

        {/* Comparison Layout */}
        <div className="relative max-w-5xl mx-auto">
          
          {/* Comparison Bridge Decor */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-20">
             <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-xl flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-400 tracking-tighter">VS</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-2xl">
            
            {/* Free Tier - Left */}
            <div className="bg-white p-10 md:p-16 flex flex-col border-b md:border-b-0 md:border-r border-slate-100">
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                    <i className="fa-solid fa-seedling"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{dict.free.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-slate-900 tracking-tighter">{dict.free.price}</span>
                </div>
                <p className="text-sm text-slate-500 mt-6 leading-relaxed font-medium min-h-[40px]">{dict.free.desc}</p>
              </div>
              
              <div className="flex-grow space-y-8">
                <div className="h-px w-full bg-slate-50"></div>
                <ul className="space-y-5">
                  {dict.free.features.map((feat: string, i: number) => (
                    <li key={i} className="flex items-start gap-4 text-sm text-slate-600 group">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                        <i className="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                      </div>
                      <span className="font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-16">
                <Link 
                  href="/courses" 
                  className="w-full btn-secondary text-center justify-center flex py-5 rounded-2xl border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-xs shadow-sm active:scale-[0.98]"
                >
                  {dict.free.cta}
                </Link>
              </div>
            </div>

            {/* Pro Tier - Right */}
            <div className="bg-slate-950 p-10 md:p-16 flex flex-col relative overflow-hidden group">
              {/* Animated Accent */}
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none"></div>
              
              <div className="mb-10 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
                      <i className="fa-solid fa-bolt-lightning"></i>
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">{dict.pro.name}</h3>
                  </div>
                  <span className="bg-brand-blue text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full shadow-lg shadow-brand-blue/20 animate-pulse">RECOMMENDED</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black text-white tracking-tighter">{dict.pro.price}</span>
                  <span className="text-slate-500 font-bold text-sm ml-2 uppercase tracking-widest">{dict.pro.period}</span>
                </div>
                <p className="text-sm text-slate-400 mt-6 leading-relaxed font-medium min-h-[40px]">{dict.pro.desc}</p>
              </div>
              
              <div className="flex-grow space-y-8 relative z-10">
                <div className="h-px w-full bg-white/5"></div>
                <ul className="space-y-5">
                  <li className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] mb-2">Everything in Scholar, plus:</li>
                  {dict.pro.features.map((feat: string, i: number) => (
                    <li key={i} className="flex items-start gap-4 text-sm text-slate-300">
                      <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                        <i className="fa-solid fa-plus text-white text-[10px]"></i>
                      </div>
                      <span className="font-semibold text-white">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-16 relative z-10">
                <button className="w-full btn-primary bg-white text-slate-950 hover:bg-brand-blue hover:text-white border-none text-xs py-5 rounded-2xl shadow-2xl shadow-brand-blue/10 active:scale-[0.98]">
                  {dict.pro.cta}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}