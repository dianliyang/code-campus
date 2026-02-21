"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";

type AchievementExportRow = {
  university: string;
  courseCode: string;
  title: string;
  credit?: number;
  gpa?: number;
  score?: number;
  completionDate?: string;
  semesters?: string[];
};

interface TranscriptExportButtonProps {
  rows: AchievementExportRow[];
  selectedSemester: string;
}

export default function TranscriptExportButton({ rows, selectedSemester }: TranscriptExportButtonProps) {
  const [selectedUniversity, setSelectedUniversity] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const universities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.university).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = useMemo(
    () => (selectedUniversity === "all" ? rows : rows.filter((r) => r.university === selectedUniversity)),
    [rows, selectedUniversity]
  );

  const exportPdf = async () => {
    if (filteredRows.length === 0 || isExporting) return;

    setIsExporting(true);
    try {
      const res = await fetch("/api/transcripts/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          university: selectedUniversity,
          semester: selectedSemester,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "transcript.pdf";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export transcript PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedUniversity}
        onChange={(e) => setSelectedUniversity(e.target.value)}
        className="h-8 rounded-md border border-[#e5e5e5] bg-white px-2 text-xs text-[#4d4d4d] outline-none"
      >
        <option value="all">All Universities</option>
        {universities.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={exportPdf}
        disabled={filteredRows.length === 0 || isExporting}
        className="h-8 inline-flex items-center gap-1.5 rounded-md border border-[#e5e5e5] bg-white px-2.5 text-xs font-medium text-[#333] hover:bg-[#f7f7f7] disabled:opacity-50"
      >
        <FileDown className="w-3.5 h-3.5" />
        {isExporting ? "Exporting..." : "Export PDF"}
      </button>
    </div>
  );
}
