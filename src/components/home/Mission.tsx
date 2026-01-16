import Globe from "@/components/ui/Globe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Mission({ dict }: { dict: any }) {
  return (
    <section id="mission" className="min-h-screen flex items-center py-20 bg-white relative overflow-hidden border-t border-slate-100">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand-blue/5 via-white to-white pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/5 border border-brand-blue/10 mb-8 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse"></div>
              <span className="text-[10px] font-mono font-bold text-brand-blue uppercase tracking-[0.2em]">{dict.label}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 leading-tight text-slate-900">
              {dict.title_prefix} <br /> {dict.title_middle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-600">{dict.title_highlight}</span>.
            </h2>
            
            <div className="space-y-6 text-slate-500 font-medium text-lg leading-relaxed max-w-xl">
              <p>
                {dict.desc_1}
              </p>
              <p>
                {dict.desc_2}
              </p>
            </div>
            
            <div className="mt-12 flex flex-wrap gap-12 border-t border-slate-100 pt-12">
              <div>
                <div className="text-4xl font-black text-slate-900 mb-1">4+</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">{dict.stat_sources}</div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-900 mb-1">2.4k</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">{dict.stat_nodes}</div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-900 mb-1">0xFC</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400">{dict.stat_schema}</div>
              </div>
            </div>
          </div>
          
          <div className="relative group perspective-1000">
             {/* Abstract Visual Decor */}
             <div className="aspect-square bg-slate-50 rounded-[2rem] border border-slate-200 flex items-center justify-center relative overflow-hidden transition-all duration-700 group-hover:rotate-y-12 group-hover:scale-105 shadow-xl shadow-slate-200/50">
                <Globe className="opacity-80 grayscale brightness-110 contrast-125" />
                
                {/* Center Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-48 h-48 bg-brand-blue/10 blur-[100px] rounded-full animate-pulse-slow"></div>
                </div>
                
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-[0.02]"></div>
             </div>
             
             {/* Floating Code Snippet Card */}
             <div className="absolute -bottom-8 -left-8 bg-white border border-slate-200 p-6 rounded-xl shadow-2xl hidden lg:block animate-float backdrop-blur-md">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">api.ts</span>
                </div>
                <code className="text-xs font-mono block text-slate-600">
                  <span className="text-brand-blue font-bold">const</span> query = <span className="text-emerald-600">"MIT"</span>;<br/>
                  <span className="text-slate-400">// Fetching schema...</span><br/>
                  <span className="text-brand-blue font-bold">200 OK</span> <span className="text-slate-400">[1.2ms]</span>
                </code>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
