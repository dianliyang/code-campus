"use client";

import { Course } from "@/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UniversityIcon from "@/components/common/UniversityIcon";
import { PenSquare, Save, RotateCcw, Loader2 } from "lucide-react";

interface AchievementCardProps {
  course: Course & { gpa?: number; score?: number; attendance?: { attended: number; total: number } };
  completionDate?: string;
}

export default function AchievementCard({ course }: AchievementCardProps) {
  const router = useRouter();
  const [completionId, setCompletionId] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [gpa, setGpa] = useState(course.gpa?.toString() || "");
  const [score, setScore] = useState(course.score?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingIncomplete, setIsMarkingIncomplete] = useState(false);

  useEffect(() => {
    // Generate ID only on client to avoid hydration mismatch
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCompletionId(`${randomPart}`);
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "update_progress",
          progress: 100,
          gpa: gpa ? parseFloat(gpa) : 0,
          score: score ? parseFloat(score) : 0
        })
      });
      if (res.ok) {
        setShowEditModal(false);
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to update achievement:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkIncomplete = async () => {
    setIsMarkingIncomplete(true);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "update_progress",
          progress: 0
        })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to mark incomplete:", e);
    } finally {
      setIsMarkingIncomplete(false);
    }
  };

  const attendanceRate = course.attendance?.total 
    ? Math.round((course.attendance.attended / course.attendance.total) * 100) 
    : 0;

  return (
    <div className="bg-white border border-[#e5e5e5] p-2.5 flex flex-col gap-2 h-full relative rounded-md">
      {/* Update Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <h3 className="text-lg font-black text-gray-900 tracking-tighter mb-1 uppercase italic">Update_Record</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Sync academic parameters: <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-4 mb-8 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-xl px-4 py-2.5 outline-none font-black text-lg transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Score %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-xl px-4 py-2.5 outline-none font-black text-lg transition-all"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sync Changes"} <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors py-2"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <UniversityIcon
            name={course.university}
            size={24}
            className="bg-gray-50 rounded border border-gray-100 p-0.5 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-medium text-[#4d4d4d] leading-none mb-0.5">
              {course.university}
            </span>
            <span className="text-[10px] text-[#9a9a9a] leading-none">
              {course.courseCode}
            </span>
          </div>
        </div>
        <div className="w-1.5 h-1.5 bg-[#c8c8c8] rounded-full"></div>
      </div>

      {/* Title */}
      <h3 className="text-[12px] font-semibold text-[#1f1f1f] leading-tight tracking-tight line-clamp-2 min-h-[2em]">
        {course.title}
      </h3>

      {/* Stats Grid */}
      <div>
        {(course.gpa || course.score || (course.attendance && course.attendance.total > 0) || course.credit) ? (
          <div className="grid grid-cols-4 gap-px bg-gray-50 border border-gray-50 rounded-md overflow-hidden">
            <div className="bg-white py-1.5 flex flex-col items-center justify-center">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">CRED</span>
              <span className="text-[11px] font-black text-gray-900 italic">{course.credit || "—"}</span>
            </div>
            <div className="bg-white py-1.5 flex flex-col items-center justify-center border-l border-gray-50">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">GPA</span>
              <span className="text-[11px] font-black text-gray-900 italic">{course.gpa ? Number(course.gpa).toFixed(1) : "—"}</span>
            </div>
            <div className="bg-white py-1.5 flex flex-col items-center justify-center border-l border-gray-50">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">SCORE</span>
              <span className="text-[11px] font-black text-gray-900 italic">{course.score ? `${Number(course.score).toFixed(0)}%` : "—"}</span>
            </div>
            <div className="bg-white py-1.5 flex flex-col items-center justify-center border-l border-gray-50">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">ATTND</span>
              <span className="text-[11px] font-black text-gray-900 italic">{attendanceRate}%</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 py-2 rounded-md border border-dashed border-gray-100 flex items-center justify-center">
            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Incomplete_Data</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 mt-auto border-t border-gray-50">
        <span className="text-[7px] font-bold text-gray-300 uppercase tracking-widest font-mono">
          ID_{completionId}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-5.5 h-5.5 rounded-md border border-gray-50 text-gray-300 hover:text-brand-blue hover:bg-blue-50 transition-all flex items-center justify-center"
          >
            <PenSquare className="w-3 h-3" />
          </button>
          <button
            onClick={handleMarkIncomplete}
            disabled={isMarkingIncomplete}
            className="w-5.5 h-5.5 rounded-md border border-gray-50 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
