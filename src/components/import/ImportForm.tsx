"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApiResponse, ImportRequest } from "@/types";
import { Loader2, LogIn, CloudUpload, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportFormProps {
  dict: {
    label: string;
    title_main: string;
    title_sub: string;
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
    <div className="w-full space-y-4 pb-4">
      <div className="flex items-start justify-between gap-3 border-b border-[#ececec] pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">{dict.label}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1f1f1f]">
            {dict.title_main} <span className="text-[#8c8c8c]">{dict.title_sub}</span>
          </h1>
        </div>
      </div>

      {message.text ? (
        <div
          className={`rounded-md border px-3 py-2 text-[12px] ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleGlobalExecute} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 rounded-lg border border-[#e5e5e5] bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-[#2a2a2a]">Manual Import</h2>
            <span className="text-[11px] text-[#888]">Required: University, Code, Title</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={dict.form_uni} required>
              <input
                required
                className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              />
            </Field>
            <Field label={dict.form_code} required>
              <input
                required
                className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
              />
            </Field>
          </div>

          <Field label={dict.form_title} required>
            <input
              required
              placeholder={dict.form_title_placeholder}
              className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={dict.form_dept}>
              <input
                placeholder={dict.form_dept_placeholder}
                className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Field>
            <Field label="Credits">
              <input
                placeholder="e.g. 3.0"
                className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={dict.form_url}>
              <input
                placeholder="https://..."
                className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white px-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </Field>
            <Field label={dict.form_level}>
              <div className="flex h-9 w-full items-center rounded-md border border-[#dddddd] overflow-hidden bg-white">
                {["undergraduate", "graduate"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFormData({ ...formData, level: lvl })}
                    className={`inline-flex h-9 flex-1 items-center justify-center px-3 text-[12px] transition-colors ${
                      formData.level === lvl
                        ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium"
                        : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
                    }`}
                  >
                    {lvl === "undergraduate" ? (dict.level_undergraduate || "undergraduate") : (dict.level_graduate || "graduate")}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label={dict.form_internal}>
            <div className="flex h-9 w-full items-center rounded-md border border-[#dddddd] overflow-hidden bg-white">
              {[false, true].map((isInternal) => (
                <button
                  key={String(isInternal)}
                  type="button"
                  onClick={() => setFormData({ ...formData, isInternal })}
                  className={`inline-flex h-9 flex-1 items-center justify-center px-3 text-[12px] transition-colors ${
                    formData.isInternal === isInternal
                      ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium"
                      : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
                  }`}
                >
                  {isInternal ? (dict.internal_private || "Internal") : (dict.internal_public || "Public")}
                </button>
              ))}
            </div>
          </Field>

          <Field label={dict.form_desc}>
            <textarea
              rows={4}
              placeholder={dict.form_desc_placeholder}
              className="w-full rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] text-[#333] outline-none focus:border-[#bcbcbc]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Field>

          <div className="pt-2 border-t border-[#ececec] flex items-center justify-end gap-2">
            {stagedBulkData ? (
              <button
                type="button"
                onClick={() => {
                  setStagedBulkData(null);
                  setStagedFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="inline-flex h-8 items-center rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear File
              </button>
            ) : null}
            <Button
              type="submit"
              disabled={loading || (!stagedBulkData && (!formData.university || !formData.courseCode || !formData.title))}
              size="sm"
              className="min-w-[160px]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {dict.submit_loading}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5">{dict.submit_btn} <LogIn className="w-3.5 h-3.5" /></span>
              )}
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-[#e5e5e5] bg-white p-4 space-y-3">
          <h2 className="text-[14px] font-semibold text-[#2a2a2a]">{dict.bulk_title}</h2>
          <p className="text-[12px] text-[#757575]">{dict.bulk_desc}</p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-lg border border-dashed p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors ${
              stagedBulkData ? "border-[#a9a9a9] bg-[#f8f8f8]" : "border-[#d8d8d8] bg-white hover:bg-[#fafafa]"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className="w-9 h-9 rounded-md border border-[#e1e1e1] bg-white flex items-center justify-center text-[#808080]">
              {stagedBulkData ? <FileCheck className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
            </div>
            <p className="text-[12px] font-medium text-[#444] text-center">{stagedFileName || dict.bulk_drop}</p>
            <p className="text-[11px] text-[#8a8a8a] text-center">
              {stagedBulkData ? `${stagedBulkData.length} courses staged` : dict.bulk_or}
            </p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json,.csv" onChange={handleFileSelect} />
          </div>

          <div className="rounded-md bg-[#f8f8f8] border border-[#ececec] px-3 py-2">
            <p className="text-[11px] font-medium text-[#666]">Current mode</p>
            <p className="mt-0.5 text-[12px] text-[#333]">{stagedBulkData ? `Bulk import (${stagedBulkData.length})` : "Manual import"}</p>
          </div>
        </section>
      </form>

      <section className="rounded-lg border border-[#e5e5e5] bg-white p-4 space-y-4">
        <h2 className="text-[14px] font-semibold text-[#2a2a2a]">{dict.protocol_title}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-[#666]">{dict.protocol_requirements}</p>
            <div className="rounded-md border border-[#ececec] overflow-hidden">
              {[
                { key: "university", req: true, note: dict.note_uni },
                { key: "courseCode", req: true, note: dict.note_code },
                { key: "title", req: true, note: dict.note_title },
                { key: "isInternal", req: false, note: dict.note_internal },
                { key: "description", req: false, note: dict.note_desc },
                { key: "url", req: false, note: dict.note_url },
                { key: "department", req: false, note: dict.note_dept },
                { key: "credit", req: false, note: "Credits (numeric)" },
              ].map((f, idx) => (
                <div key={f.key} className={`px-3 py-2.5 flex items-center justify-between gap-3 ${idx !== 0 ? "border-t border-[#f0f0f0]" : ""}`}>
                  <div>
                    <p className="text-[12px] font-medium text-[#222]">{f.key}</p>
                    <p className="text-[11px] text-[#8a8a8a]">{f.note}</p>
                  </div>
                  <span className={`text-[11px] ${f.req ? "text-rose-600" : "text-[#9a9a9a]"}`}>
                    {f.req ? dict.req_required : dict.req_optional}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[12px] font-medium text-[#666] mb-1.5">{dict.protocol_json_blueprint}</p>
              <pre className="rounded-md border border-[#ececec] bg-[#fafafa] p-3 text-[11px] text-[#444] overflow-x-auto">
{`[
  {
    "university": "MIT",
    "courseCode": "6.001",
    "title": "Structure..."
  }
]`}
              </pre>
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#666] mb-1.5">{dict.protocol_csv_headers}</p>
              <div className="flex flex-wrap gap-1.5">
                {["university", "courseCode", "title"].map((h) => (
                  <span key={h} className="rounded-md border border-[#e3e3e3] bg-white px-2 py-1 text-[11px] text-[#555]">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex w-full flex-col items-start gap-1.5">
      <span className="block text-[11px] font-medium text-[#666] leading-none">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      <div className="w-full">{children}</div>
    </label>
  );
}
