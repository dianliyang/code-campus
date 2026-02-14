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
    <div className="bg-white border border-gray-100 p-6 flex flex-col gap-4 h-full relative group hover:border-brand-green/30 transition-all rounded-[2rem]">
      {/* Update Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-2 uppercase italic">Update_Record</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">
                DATA_MODIFICATION_PROTOCOL <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-6 mb-10 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GPA_VAL</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-2xl px-4 py-3 outline-none font-black text-xl transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SCORE_PCT</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-2xl px-4 py-3 outline-none font-black text-xl transition-all"
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
                className="w-full bg-gray-900 text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {isUpdating ? "..." : "COMMIT_CHANGES"} <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors py-2"
              >
                ABORT_ACTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <UniversityIcon
            name={course.university}
            size={32}
            className="bg-gray-50 rounded-lg border border-gray-100 p-1 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-black text-brand-green uppercase tracking-[0.2em] leading-none mb-1">
              {course.university}
            </span>
            <span className="text-[9px] font-bold text-gray-300 font-mono leading-none">
              {course.courseCode}
            </span>
          </div>
        </div>
        <div className="w-1.5 h-1.5 bg-brand-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
      </div>

      {/* Title */}
      <h3 className="text-base font-black text-gray-900 leading-tight tracking-tight line-clamp-2 group-hover:text-brand-green transition-colors uppercase italic pr-8">
        {course.title}
      </h3>

      {/* Status Bar */}
      <div className="flex items-center gap-1 my-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-brand-green/20 rounded-full">
            <div className="h-full bg-brand-green rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="flex-grow flex flex-col justify-end mt-2">
        {(course.gpa || course.score || (course.attendance && course.attendance.total > 0) || course.credit) ? (
          <div className="grid grid-cols-2 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-white p-3 flex flex-col items-center">
              <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">CREDITS</span>
              <span className="text-lg font-black text-gray-900 italic tracking-tighter">{course.credit || "N/A"}</span>
            </div>
            <div className="bg-white p-3 flex flex-col items-center">
              <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">GPA_VAL</span>
              <span className="text-lg font-black text-brand-green italic tracking-tighter">{course.gpa ? Number(course.gpa).toFixed(2) : "N/A"}</span>
            </div>
            <div className="bg-white p-3 flex flex-col items-center">
              <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">SCORE_PCT</span>
              <span className="text-lg font-black text-gray-900 italic tracking-tighter">{course.score ? `${Number(course.score).toFixed(0)}%` : "N/A"}</span>
            </div>
            <div className="bg-white p-3 flex flex-col items-center">
              <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">RELIABILITY</span>
              <span className="text-lg font-black text-gray-900 italic tracking-tighter">
                {course.attendance?.total ? Math.round((course.attendance.attended / course.attendance.total) * 100) : 0}%
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-100 flex items-center justify-center">
            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">NO_RECORDS_FOUND</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] font-mono">
          CERT_ID: {completionId}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEditModal(true)}
            className="w-8 h-8 rounded-lg border border-gray-100 text-gray-300 hover:text-brand-blue hover:bg-blue-50 hover:border-brand-blue/20 transition-all flex items-center justify-center"
          >
            <PenSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMarkIncomplete}
            disabled={isMarkingIncomplete}
            className="w-8 h-8 rounded-lg border border-gray-100 text-gray-300 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
