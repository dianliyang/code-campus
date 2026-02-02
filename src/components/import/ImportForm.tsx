"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiResponse, ImportRequest } from "@/types";
import { Loader2, LogIn, ArrowLeft, CloudUpload, FileCheck } from "lucide-react";

interface ImportFormProps {
  dict: {
    label: string;
    title_main: string;
    title_sub: string;
    return_btn: string;
    form_uni: string;
    form_code: string;
    form_title: string;
    form_url: string;
    form_level: string;
    level_undergraduate: string;
    level_graduate: string;
    form_internal: string;
    internal_public: string;
    internal_private: string;
    form_desc: string;
    form_dept: string;
    form_units: string;
    form_uni_placeholder: string;
    form_code_placeholder: string;
    form_title_placeholder: string;
    form_dept_placeholder: string;
    form_units_placeholder: string;
    form_desc_placeholder: string;
    submit_btn: string;
    submit_loading: string;
    bulk_title: string;
    bulk_desc: string;
    bulk_drop: string;
    bulk_or: string;
    msg_success: string;
    msg_error_network: string;
    msg_bulk_success: string;
    protocol_title: string;
    protocol_requirements: string;
    protocol_json_blueprint: string;
    protocol_csv_headers: string;
    req_required: string;
    req_optional: string;
    note_uni: string;
    note_code: string;
    note_title: string;
    note_internal: string;
    note_desc: string;
    note_url: string;
    note_dept: string;
    note_units: string;
  };
}

export default function ImportForm({ dict }: ImportFormProps) {
  const [formData, setFormData] = useState<ImportRequest>({
    university: "", 
    courseCode: "", 
    title: "", 
    description: "", 
    url: "", 
    level: "undergraduate",
    isInternal: false,
    department: "",
    credit: ""
  });
  const [stagedBulkData, setStagedBulkData] = useState<ImportRequest[] | null>(null);
  const [stagedFileName, setStagedFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const executeManualImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json() as ApiResponse;
      if (res.ok) {
        setMessage({ type: "success", text: dict.msg_success });
        setFormData({
          university: "", courseCode: "", title: "", description: "", url: "", level: "undergraduate", isInternal: false, credit: "", department: ""
        });
        setTimeout(() => router.push("/study-plan"), 2000);
      } else {
        setMessage({ type: "error", text: (data.error + (data.details ? `: ${data.details}` : "")) || "Error" });
      }
    } catch (err: unknown) {
      console.error("Submission error:", err);
      setMessage({ type: "error", text: dict.msg_error_network });
    } finally {
      setLoading(false);
    }
  };

  const executeBulkImport = async () => {
    if (!stagedBulkData) return;
    setLoading(true);
    try {
      const res = await fetch("/api/courses/import/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stagedBulkData)
      });
      const data = await res.json() as ApiResponse;
      if (res.ok) {
        setMessage({ type: "success", text: dict.msg_bulk_success });
        setStagedBulkData(null);
        setStagedFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => router.push("/study-plan"), 2000);
      } else {
        setMessage({ type: "error", text: (data.error + (data.details ? `: ${data.details}` : "")) || "Bulk Error" });
      }
    } catch (err: unknown) {
      console.error("Bulk upload error:", err);
      setMessage({ type: "error", text: dict.msg_error_network });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedBulkData) {
      executeBulkImport();
    } else {
      executeManualImport();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStagedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let data: ImportRequest[] = [];
        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          data = lines.slice(1).filter(l => l.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            return headers.reduce((obj: Record<string, string>, header, index) => {
              obj[header] = values[index];
              return obj;
            }, {});
          }) as unknown as ImportRequest[];
        }
        setStagedBulkData(data);
        setMessage({ type: "success", text: `Ready to import ${data.length} courses from ${file.name}` });
      } catch (err) {
        console.error("File parse error:", err);
        setMessage({ type: "error", text: "Invalid file format" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative pb-32">
      {/* Global Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 py-6 px-4 md:px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">System Protocol</span>
              <span className="text-xs font-bold text-gray-900 uppercase">{stagedBulkData ? `Bulk Ingest (${stagedBulkData.length} nodes)` : 'Manual Single Entry'}</span>
            </div>
            {message.text && (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 border-green-100 text-brand-green' : 'bg-red-50 border-red-100 text-red-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${message.type === 'success' ? 'bg-brand-green' : 'bg-red-500'} animate-pulse`}></span>
                {message.text}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {stagedBulkData && (
              <button 
                onClick={() => { setStagedBulkData(null); setStagedFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors px-4"
              >
                Clear File
              </button>
            )}
            <button 
              onClick={handleGlobalExecute}
              disabled={loading || (!stagedBulkData && (!formData.university || !formData.courseCode || !formData.title))}
              className="flex-grow md:flex-grow-0 btn-primary px-12 py-4 rounded-2xl shadow-2xl shadow-brand-blue/30 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none min-w-[200px]"
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {dict.submit_loading}</span>
              ) : (
                <span className="flex items-center gap-2">{dict.submit_btn} <LogIn className="w-3 h-3" /></span>
              )}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        {/* Header */}
        <div className="relative mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.5em] mb-4 block">
              {dict.label}
            </span>
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
              {dict.title_main} <br /> <span className="text-gray-200">{dict.title_sub}</span>
            </h1>
          </div>
          <Link href="/study-plan" className="text-[10px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
            <ArrowLeft className="w-2.5 h-2.5" />
            {dict.return_btn}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
          {/* Left Column: Manual Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleGlobalExecute} className="space-y-20">
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="flex flex-col gap-3 group">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                      {dict.form_uni}
                    </label>
                    <input 
                      required 
                      placeholder={dict.form_uni_placeholder}
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 tracking-tighter"
                      value={formData.university} 
                      onChange={(e) => setFormData({...formData, university: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col gap-3 group">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                      {dict.form_code}
                    </label>
                    <input 
                      required 
                      placeholder={dict.form_code_placeholder}
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 tracking-tighter"
                      value={formData.courseCode} 
                      onChange={(e) => setFormData({...formData, courseCode: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 group">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                    {dict.form_title}
                  </label>
                  <input 
                    required 
                    placeholder={dict.form_title_placeholder}
                    className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-xl font-black transition-all placeholder:text-gray-100 tracking-tighter"
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      {dict.form_dept}
                    </label>
                    <input 
                      placeholder={dict.form_dept_placeholder}
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                      value={formData.department} 
                      onChange={(e) => setFormData({...formData, department: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      Credits
                    </label>
                    <input 
                      placeholder="e.g. 3.0"
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                      value={formData.credit} 
                      onChange={(e) => setFormData({...formData, credit: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      {dict.form_url}
                    </label>
                    <input 
                      placeholder="https://..."
                      className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                      value={formData.url} 
                      onChange={(e) => setFormData({...formData, url: e.target.value})} 
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      {dict.form_level}
                    </label>
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100">
                      {['undergraduate', 'graduate'].map(lvl => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setFormData({...formData, level: lvl})}
                          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.level === lvl ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {lvl === 'undergraduate' ? (dict.level_undergraduate || 'undergraduate') : (dict.level_graduate || 'graduate')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                      {dict.form_internal}
                    </label>
                    <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100">
                      {[false, true].map(isInternal => (
                        <button
                          key={String(isInternal)}
                          type="button"
                          onClick={() => setFormData({...formData, isInternal: isInternal})}
                          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.isInternal === isInternal ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {isInternal ? (dict.internal_private || 'Internal') : (dict.internal_public || 'Public')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                    {dict.form_desc}
                  </label>
                  <textarea 
                    rows={4} 
                    placeholder={dict.form_desc_placeholder}
                    className="bg-gray-50 border border-gray-100 rounded-3xl p-8 outline-none text-sm font-medium transition-all focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20"
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
              </div>
            </form>

            <div className="mt-32 pt-24 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-16">
                <div className="w-2 h-2 bg-brand-blue rounded-full"></div>
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.4em]">{dict.protocol_title}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="space-y-10">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{dict.protocol_requirements}</span>
                  <div className="space-y-6">
                    {[ 
                      { key: 'university', req: true, note: dict.note_uni },
                      { key: 'courseCode', req: true, note: dict.note_code },
                      { key: 'title', req: true, note: dict.note_title },
                      { key: 'isInternal', req: false, note: dict.note_internal },
                      { key: 'description', req: false, note: dict.note_desc },
                      { key: 'url', req: false, note: dict.note_url },
                      { key: 'department', req: false, note: dict.note_dept },
                      { key: 'credit', req: false, note: "Credits (numeric)" },
                    ].map(f => (
                      <div key={f.key} className="flex items-center justify-between border-b border-gray-50 pb-4">
                        <div>
                          <span className="text-xs font-bold text-gray-900 font-mono lowercase">{f.key}</span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">{f.note}</p>
                        </div>
                        {f.req ? (
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{dict.req_required}</span>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{dict.req_optional}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">{dict.protocol_json_blueprint}</span>
                    <pre className="bg-gray-900 p-8 rounded-3xl text-[11px] font-mono text-blue-300 overflow-x-auto">
{`[
  {
    "university": "MIT",
    "courseCode": "6.001",
    "title": "Structure..."
  }
]`}                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-6">{dict.protocol_csv_headers}</span>
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
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">
                  {dict.bulk_title}
                </h3>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                  {dict.bulk_desc}
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`group border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-6 transition-all cursor-pointer ${stagedBulkData ? 'border-brand-blue bg-blue-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-brand-blue hover:bg-blue-50/30'}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <div className={`w-16 h-16 bg-white border rounded-2xl flex items-center justify-center transition-all shadow-sm ${stagedBulkData ? 'border-brand-blue text-brand-blue scale-110' : 'border-gray-100 text-gray-300 group-hover:text-brand-blue group-hover:scale-110'}`}>
                  {stagedBulkData ? <FileCheck className="w-5 h-5" /> : <CloudUpload className="w-5 h-5" />}
                </div>
                <div className="text-center">
                  <span className={`text-[11px] font-black uppercase tracking-[0.2em] block mb-1 ${stagedBulkData ? 'text-brand-blue' : 'text-gray-500 group-hover:text-brand-blue'}`}>
                    {stagedFileName || dict.bulk_drop}
                  </span>
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                    {stagedBulkData ? `${stagedBulkData.length} courses identified` : dict.bulk_or}
                  </span>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv" onChange={handleFileSelect} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
