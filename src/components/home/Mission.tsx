import Globe from "@/components/ui/Globe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Mission({ dict }: { dict: any }) {
  return (
    <section id="mission" className="min-h-screen flex items-center py-20 bg-gray-900 text-white overflow-hidden border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em]">{dict.label}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-8 leading-tight">
              {dict.title_prefix} <br /> {dict.title_middle} <span className="text-brand-blue">{dict.title_highlight}</span>.
            </h2>
            
            <div className="space-y-6 text-gray-400 font-medium text-lg leading-relaxed max-w-xl">
              <p>
                {dict.desc_1}
              </p>
              <p>
                {dict.desc_2}
              </p>
            </div>
            
            <div className="mt-12 flex flex-wrap gap-12">
              <div>
                <div className="text-4xl font-black text-white mb-1">4+</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">{dict.stat_sources}</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-1">2.4k</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">{dict.stat_nodes}</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-1">0xFC</div>
                <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">{dict.stat_schema}</div>
              </div>
            </div>
          </div>
          
          <div className="relative">
             {/* Abstract Visual Decor */}
             <div className="aspect-square bg-gradient-to-br from-brand-blue/5 to-brand-green/5 rounded-[2rem] border border-white/5 flex items-center justify-center relative overflow-hidden group">
                <Globe className="opacity-90" />
                
                {/* Center Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="w-32 h-32 bg-brand-blue/10 blur-3xl rounded-full"></div>
                </div>
             </div>
             
             {/* Floating Code Snippet Card */}
             <div className="absolute -bottom-6 -left-6 bg-gray-800 border border-white/10 p-6 rounded-2xl shadow-2xl hidden lg:block animate-float">
                <div className="flex gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
                <code className="text-xs text-brand-blue font-mono">
                  GET /v1/curricula/mit<br />
                  <span className="text-gray-500">200 OK [1.2ms]</span>
                </code>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
