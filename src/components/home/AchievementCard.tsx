"use client";

import { Course } from "@/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UniversityIcon from "@/components/common/UniversityIcon";
import { PenSquare, Save, RotateCcw } from "lucide-react";

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

  return (
    <div className="bg-white border border-gray-100 p-5 flex flex-col gap-4 h-full relative group hover:border-brand-green/30 transition-all hover:shadow-xl hover:shadow-brand-green/5 rounded-2xl">
      {/* Update Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-2 border-gray-900 rounded-3xl p-8 shadow-[12px_12px_0_0_rgba(0,0,0,1)] w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-2 uppercase">Update Achievement</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Refine your records for <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-6 mb-10 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final GPA (0-5.0)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-black text-lg transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Score (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-black text-lg transition-all"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Save Changes"} <Save className="w-2.5 h-2.5" />
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <UniversityIcon
          name={course.university}
          size={36}
          className="bg-gray-50 rounded-xl border border-gray-100 p-1.5 flex-shrink-0"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-brand-green uppercase tracking-[0.15em] leading-none">
              {course.university}
            </span>
            <div className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_6px_rgba(34,197,94,0.5)]"></div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-gray-400 font-mono">
              {course.courseCode}
            </span>
            {course.semesters && course.semesters.length > 0 && (
              <span className="text-[9px] font-medium text-gray-300">
                • {course.semesters[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-gray-900 leading-snug tracking-tight line-clamp-2 group-hover:text-brand-green transition-colors">
        {course.title}
      </h3>

      {/* Stats */}
      <div className="flex-grow flex flex-col justify-end">
        {(course.gpa || course.score || (course.attendance && course.attendance.total > 0) || course.credit) ? (
          <div className="flex items-center bg-gray-50/80 rounded-xl px-4 py-3 gap-4">
            {course.credit && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Credits</span>
                <span className="text-xs font-black text-gray-900">{course.credit}</span>
              </div>
            )}
            {course.credit && (course.gpa || course.score || (course.attendance && course.attendance.total > 0)) && <div className="w-px h-5 bg-gray-200"></div>}
            
            {course.gpa && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">GPA</span>
                <span className="text-xs font-black text-gray-900">{Number(course.gpa).toFixed(2)}</span>
              </div>
            )}
            {course.gpa && (course.score || (course.attendance && course.attendance.total > 0)) && <div className="w-px h-5 bg-gray-200"></div>}

            {course.score && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Score</span>
                <span className="text-xs font-black text-gray-900">{Number(course.score).toFixed(0)}%</span>
              </div>
            )}
            {course.score && (course.attendance && course.attendance.total > 0) && <div className="w-px h-5 bg-gray-200"></div>}

            {course.attendance && course.attendance.total > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em]">Attendance</span>
                <span className="text-xs font-black text-gray-900">{course.attendance.attended}<span className="text-[10px] text-gray-400">/{course.attendance.total}</span></span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50/50 p-3 rounded-lg border border-dashed border-gray-100">
            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">No grades recorded</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.15em] font-mono">
          ID: {completionId}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 bg-white hover:bg-gray-50 hover:text-gray-600 hover:border-gray-300 transition-all flex items-center justify-center"
            title="Edit Grade"
          >
            <PenSquare className="w-3 h-3" />
          </button>
          <button
            onClick={handleMarkIncomplete}
            disabled={isMarkingIncomplete}
            className="w-7 h-7 rounded-lg border border-gray-200 text-gray-400 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center disabled:opacity-50"
            title="Mark Incomplete"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
