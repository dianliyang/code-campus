"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ImportPage() {
  const [formData, setFormData] = useState({
    university: "", courseCode: "", title: "", description: "", url: "", level: "undergraduate"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setTimeout(() => router.push("/"), 2000);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch { 
      setMessage({ type: "error", text: "Network sync failure" }); 
    }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      let courses = [];

      try {
        if (file.name.endsWith('.json')) {
          courses = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          courses = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj: Record<string, string>, header, index) => {
              obj[header] = values[index];
              return obj;
            }, {});
          });
        }

        const res = await fetch("/api/courses/import/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(courses)
        });
        const data = await res.json();
        
        if (res.ok) {
          setMessage({ type: "success", text: data.message });
          setTimeout(() => router.push("/"), 3000);
        } else setMessage({ type: "error", text: data.error });

    } catch {
      setMessage({ type: "error", text: "Failed to import courses. Please check the file format." });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        {/* Header */}
        <div className="relative mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">

          <div>
            <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.5em] mb-4 block">Batch Processing</span>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
              Ingest <br /> <span className="text-gray-200">Data_Package</span>
            </h1>
          </div>
          <Link href="/study-plan" className="text-[10px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
            <i className="fa-solid fa-arrow-left text-[8px]"></i>
            Return to Roadmap
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
          {/* Left Column: Manual Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-20">
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="flex flex-col gap-3 group">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">University Institution</label>
                    <input 
                      required 
                      placeholder="e.g. Stanford"
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 uppercase tracking-tighter" 
                      value={formData.university} 
                      onChange={(e) => setFormData({...formData, university: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col gap-3 group">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">Registry Code</label>
                    <input 
                      required 
                      placeholder="e.g. CS106A"
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 uppercase tracking-tighter" 
                      value={formData.courseCode} 
                      onChange={(e) => setFormData({...formData, courseCode: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 group">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">Course Title</label>
                  <input 
                    required 
                    placeholder="e.g. Programming Methodology"
                    className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 uppercase tracking-tighter" 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Global Reference (URL)</label>
                    <input 
                      placeholder="https://..."
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100" 
                      value={formData.url} 
                      onChange={(e) => setFormData({...formData, url: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Academic Level</label>
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100">
                      {['undergraduate', 'graduate'].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setFormData({...formData, level: lvl})}
                          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            formData.level === lvl ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Curriculum Overview</label>
                  <textarea 
                    rows={4} 
                    placeholder="Enter detailed curriculum overview and learning objectives..."
                    className="bg-gray-50 border border-gray-100 rounded-3xl p-8 outline-none text-sm font-medium transition-all focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20" 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-10 pt-10">
                <button 
                  disabled={loading} 
                  className="btn-secondary disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "PROCESSING..." : "Execute Entry"}
                </button>

                {message.type && !fileInputRef.current?.value && (
                  <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-3 ${message.type === 'success' ? 'text-brand-green' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-brand-green' : 'bg-red-500'} animate-pulse`}></span>
                    {message.text}
                  </span>
                )}
              </div>
            </form>

            {/* Data Format Reference - Detailed and Straightforward */}
            <div className="mt-32 pt-24 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-16">
                <div className="w-2 h-2 bg-brand-blue rounded-full"></div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.4em]">Data Structure Protocol</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="space-y-10">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Field Requirements</span>
                  <div className="space-y-6">
                    {[
                      { key: 'university', req: true, note: 'Official school name' },
                      { key: 'courseCode', req: true, note: 'Unique alphanumeric ID' },
                      { key: 'title', req: true, note: 'Full name of course' },
                      { key: 'description', req: false, note: 'Optional overview' },
                      { key: 'url', req: false, note: 'Link to catalog' },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div>
                          <span className="text-xs font-bold text-gray-900 font-mono lowercase">{f.key}</span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">{f.note}</p>
                        </div>
                        {f.req ? (
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Required *</span>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Optional</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">JSON Blueprint</span>
                    <pre className="bg-gray-900 p-8 rounded-3xl text-[11px] font-mono text-blue-300 overflow-x-auto">
{`[{
  "university": "MIT",
  "courseCode": "6.001",
  "title": "Structure..."
}]`}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">CSV Headers</span>
                    <div className="flex flex-wrap gap-2">
                      {['university', 'courseCode', 'title'].map(h => (
                        <span key={h} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-mono font-bold text-gray-600">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Bulk Upload */}
          <div className="relative">
            <div className="absolute -left-12 top-0 bottom-0 w-px bg-gray-50 hidden lg:block"></div>
            <div className="space-y-10 sticky top-32">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Bulk Upload</h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">Accepted formats: .JSON or .CSV data packages.</p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-gray-100 rounded-3xl p-12 flex flex-col items-center justify-center gap-6 hover:border-brand-blue hover:bg-blue-50/30 transition-all cursor-pointer bg-gray-50/30"
              >
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-300 group-hover:text-brand-blue group-hover:scale-110 transition-all shadow-sm">
                  <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] block mb-1 group-hover:text-brand-blue">Initialize Upload</span>
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">or drag and drop</span>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv" onChange={handleFileUpload} />
              </div>

              {message.text && fileInputRef.current?.value && (
                <div className={`p-6 rounded-2xl border text-[11px] font-black uppercase tracking-widest leading-relaxed ${message.type === 'success' ? 'bg-green-50 border-green-100 text-brand-green' : 'bg-red-50 border-red-100 text-red-500'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
  );
}