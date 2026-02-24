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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl p-4 w-full max-w-sm animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-[#1f1f1f]">Update performance</h3>
              <p className="text-xs text-[#7a7a7a] mt-1 line-clamp-2">{course.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[#666]">GPA</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  placeholder="0.00"
                  className="h-10 rounded-md border border-[#d8d8d8] bg-white px-3 text-[14px] font-medium text-[#222] outline-none focus:border-[#bcbcbc]"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[#666]">Score %</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0.0"
                  className="h-10 rounded-md border border-[#d8d8d8] bg-white px-3 text-[14px] font-medium text-[#222] outline-none focus:border-[#bcbcbc]"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 h-9 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 h-9 rounded-md border border-[#1f1f1f] bg-[#1f1f1f] text-[13px] font-medium text-white hover:bg-[#2a2a2a] disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
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
            className="bg-gray-50 rounded border border-gray-100 flex-shrink-0"
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
        {(course.gpa || (course.attendance && course.attendance.total > 0) || course.credit) ? (
          <div className="grid grid-cols-3 gap-px bg-gray-50 border border-gray-50 rounded-md overflow-hidden">
            <div className="bg-white py-1.5 flex flex-col items-center justify-center">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">CRED</span>
              <span className="text-[11px] font-black text-gray-900 italic">{course.credit || "—"}</span>
            </div>
            <div className="bg-white py-1.5 flex flex-col items-center justify-center border-l border-gray-50">
              <span className="text-[6px] font-bold text-gray-300 uppercase tracking-widest mb-0.5">GPA</span>
              <span className="text-[11px] font-black text-gray-900 italic">{course.gpa ? Number(course.gpa).toFixed(1) : "—"}</span>
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
            className="w-8 h-8 rounded-md border border-[#d3d3d3] text-[#666] hover:text-brand-blue hover:bg-blue-50 transition-all flex items-center justify-center"
            aria-label="Edit GPA and score"
          >
            <PenSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMarkIncomplete}
            disabled={isMarkingIncomplete}
            className="w-8 h-8 rounded-md border border-[#d3d3d3] text-[#666] hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-50"
            aria-label="Mark incomplete"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
