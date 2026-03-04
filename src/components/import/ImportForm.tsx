"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ApiResponse, ImportRequest } from "@/types";
import { Loader2, LogIn, CloudUpload, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
    credit: "",
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
        body: JSON.stringify(formData),
      });
      const data = (await res.json()) as ApiResponse;
      if (res.ok) {
        setMessage({ type: "success", text: dict.msg_success });
        setFormData({
          university: "",
          courseCode: "",
          title: "",
          description: "",
          url: "",
          level: "undergraduate",
          isInternal: false,
          credit: "",
          department: "",
        });
        setTimeout(() => router.push("/study-plan"), 2000);
      } else {
        setMessage({ type: "error", text: data.error + (data.details ? `: ${data.details}` : "") || "Error" });
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
        body: JSON.stringify(stagedBulkData),
      });
      const data = (await res.json()) as ApiResponse;
      if (res.ok) {
        setMessage({ type: "success", text: dict.msg_bulk_success });
        setStagedBulkData(null);
        setStagedFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => router.push("/study-plan"), 2000);
      } else {
        setMessage({ type: "error", text: data.error + (data.details ? `: ${data.details}` : "") || "Bulk Error" });
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
    if (stagedBulkData) executeBulkImport();
    else executeManualImport();
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
        if (file.name.endsWith(".json")) {
          data = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());
          data = lines
            .slice(1)
            .filter((l) => l.trim())
            .map((line) => {
              const values = line.split(",").map((v) => v.trim());
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
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.label}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {dict.title_main} <span className="text-muted-foreground">{dict.title_sub}</span>
        </h1>
      </div>

      {message.text ? (
        <div
          className={`rounded-sm border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Separator />

      <form onSubmit={handleGlobalExecute} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="space-y-3 rounded-sm border p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Manual Import</h2>
            <span className="text-xs text-muted-foreground">Required: University, Code, Title</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={dict.form_uni} required>
              <Input
                required
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              />
            </Field>
            <Field label={dict.form_code} required>
              <Input
                required
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
              />
            </Field>
          </div>

          <Field label={dict.form_title} required>
            <Input
              required
              placeholder={dict.form_title_placeholder}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={dict.form_dept}>
              <Input
                placeholder={dict.form_dept_placeholder}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </Field>
            <Field label="Credits">
              <Input
                placeholder="e.g. 3.0"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={dict.form_url}>
              <Input
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </Field>
            <Field label={dict.form_level}>
              <Tabs value={formData.level} onValueChange={(level) => setFormData({ ...formData, level: level as "undergraduate" | "graduate" })}>
                <TabsList className="w-full">
                  <TabsTrigger value="undergraduate" className="flex-1">{dict.level_undergraduate || "undergraduate"}</TabsTrigger>
                  <TabsTrigger value="graduate" className="flex-1">{dict.level_graduate || "graduate"}</TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>
          </div>

          <Field label={dict.form_internal}>
            <Tabs
              value={formData.isInternal ? "internal" : "public"}
              onValueChange={(value) => setFormData({ ...formData, isInternal: value === "internal" })}
            >
              <TabsList className="w-full">
                <TabsTrigger value="public" className="flex-1">{dict.internal_public || "Public"}</TabsTrigger>
                <TabsTrigger value="internal" className="flex-1">{dict.internal_private || "Internal"}</TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>

          <Field label={dict.form_desc}>
            <Textarea
              rows={5}
              placeholder={dict.form_desc_placeholder}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            {stagedBulkData ? (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setStagedBulkData(null);
                  setStagedFileName("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear File
              </Button>
            ) : null}
            <Button
              variant="outline"
              type="submit"
              disabled={loading || (!stagedBulkData && (!formData.university || !formData.courseCode || !formData.title))}
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="animate-spin" />
                  {dict.submit_loading}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {dict.submit_btn}
                  <LogIn />
                </span>
              )}
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-sm border p-4">
          <h2 className="text-sm font-semibold">{dict.bulk_title}</h2>
          <p className="text-sm text-muted-foreground">{dict.bulk_desc}</p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-sm border border-dashed p-5 text-center transition-colors ${
              stagedBulkData ? "bg-muted" : "hover:bg-muted/40"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-sm border">
              {stagedBulkData ? <FileCheck className="h-4 w-4" /> : <CloudUpload className="h-4 w-4" />}
            </div>
            <p className="text-sm font-medium">{stagedFileName || dict.bulk_drop}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stagedBulkData ? `${stagedBulkData.length} courses staged` : dict.bulk_or}
            </p>
            <Input type="file" ref={fileInputRef} accept=".json,.csv" onChange={handleFileSelect} />
          </div>

          <div className="rounded-sm border p-3">
            <p className="text-xs text-muted-foreground">Current mode</p>
            <p className="mt-1 text-sm">{stagedBulkData ? `Bulk import (${stagedBulkData.length})` : "Manual import"}</p>
          </div>
        </section>
      </form>

      <Separator />

      <section className="space-y-3 rounded-sm border p-4">
        <h2 className="text-sm font-semibold">{dict.protocol_title}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{dict.protocol_requirements}</p>
            <div className="rounded-sm border">
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
                <div key={f.key} className={`flex items-center justify-between gap-3 px-3 py-2 ${idx !== 0 ? "border-t" : ""}`}>
                  <div>
                    <p className="text-sm font-medium">{f.key}</p>
                    <p className="text-xs text-muted-foreground">{f.note}</p>
                  </div>
                  <span className={`text-xs ${f.req ? "text-destructive" : "text-muted-foreground"}`}>
                    {f.req ? dict.req_required : dict.req_optional}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{dict.protocol_json_blueprint}</p>
              <pre className="overflow-x-auto rounded-sm border p-3 text-xs">{`[
  {
    "university": "MIT",
    "courseCode": "6.001",
    "title": "Structure..."
  }
]`}</pre>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{dict.protocol_csv_headers}</p>
              <div className="flex flex-wrap gap-1.5">
                {["university", "courseCode", "title"].map((h) => (
                  <span key={h} className="rounded-sm border px-2 py-1 text-xs">
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
      <span className="text-sm font-medium leading-none">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      <div className="w-full">{children}</div>
    </label>
  );
}
