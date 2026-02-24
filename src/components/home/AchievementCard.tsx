"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import UniversityIcon from "@/components/common/UniversityIcon";
import { PenSquare, Save, RotateCcw, Loader2 } from "lucide-react";

interface AchievementCardProps {
  course: Course & { gpa?: number; score?: number; attendance?: { attended: number; total: number } };
  completionDate?: string;
}

export default function AchievementCard({ course }: AchievementCardProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [gpa, setGpa] = useState(course.gpa?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingIncomplete, setIsMarkingIncomplete] = useState(false);

  const attendanceRate = course.attendance?.total
    ? Math.round((course.attendance.attended / course.attendance.total) * 100)
    : null;

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
        }),
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
        body: JSON.stringify({ courseId: course.id, action: "update_progress", progress: 0 }),
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error("Failed to mark incomplete:", e);
    } finally {
      setIsMarkingIncomplete(false);
    }
  };

  return (
    <>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl p-4 w-full max-w-xs animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Update performance</h3>
              <p className="text-xs text-[#7a7a7a] mt-1 line-clamp-2">{course.title}</p>
            </div>
            <label className="flex flex-col gap-1.5 mb-4">
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

      {/* Compact card row */}
      <div className="bg-white border border-[#e5e5e5] rounded-md px-3 py-2.5 flex items-center gap-3">
        <UniversityIcon
          name={course.university}
          size={20}
          className="bg-gray-50 rounded border border-gray-100 flex-shrink-0"
        />

        {/* Course info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#9a9a9a] leading-none mb-0.5">{course.courseCode}</p>
          <p className="text-[13px] font-semibold text-[#1f1f1f] leading-tight truncate">{course.title}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 shrink-0">
          {course.credit && (
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">CR</span>
              <span className="text-[11px] font-bold text-[#444]">{course.credit}</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">GPA</span>
            <span className="text-[11px] font-bold text-[#444]">{course.gpa ? Number(course.gpa).toFixed(1) : "—"}</span>
          </div>
          {attendanceRate !== null && (
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">ATT</span>
              <span className="text-[11px] font-bold text-[#444]">{attendanceRate}%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-7 h-7 rounded-md border border-[#e5e5e5] text-[#999] hover:text-[#333] hover:bg-[#f5f5f5] transition-all flex items-center justify-center"
            aria-label="Edit GPA"
          >
            <PenSquare className="w-3 h-3" />
          </button>
          <button
            onClick={handleMarkIncomplete}
            disabled={isMarkingIncomplete}
            className="w-7 h-7 rounded-md border border-[#e5e5e5] text-[#999] hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-50"
            aria-label="Mark incomplete"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}
