"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AchievementCardProps {
  course: Course & { gpa?: number; score?: number };
  completionDate?: string;
  masteredLabel?: string;
}

export default function AchievementCard({ course, masteredLabel }: AchievementCardProps) {
  const router = useRouter();
  const [completionId, setCompletionId] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [gpa, setGpa] = useState(course.gpa?.toString() || "");
  const [score, setScore] = useState(course.score?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Generate ID only on client to avoid hydration mismatch
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCompletionId(`${randomPart}`); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const logos: Record<string, string> = {
    "MIT": "/mit.svg", 
    "Stanford": "/stanford.jpg", 
    "CMU": "/cmu.jpg", 
    "UC Berkeley": "/ucb.png", 
    "CAU Kiel": "/cau.png",
  };

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

  return (
    <div className="bg-white border border-gray-100 p-6 flex flex-col gap-5 h-full relative group hover:border-brand-green/30 transition-all hover:shadow-xl hover:shadow-brand-green/5 rounded-2xl">
      {/* Edit Trigger */}
      <button 
        onClick={() => setShowEditModal(true)}
        className="absolute top-4 right-4 p-2 rounded-lg bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-brand-blue hover:bg-blue-50 cursor-pointer z-10"
        title="Update Grade"
      >
        <i className="fa-solid fa-pen-to-square text-[10px]"></i>
      </button>

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
                {isUpdating ? "Updating..." : "Save Changes"} <i className="fa-solid fa-save text-[10px]"></i>
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

      {/* Tiny Status Dot */}
      <div className="absolute top-6 right-6 w-2 h-2 bg-brand-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)] group-hover:opacity-0 transition-opacity"></div>

      <div className="flex items-center gap-3">
        {logos[course.university] ? (
          <div className="w-10 h-10 relative bg-gray-50 rounded-lg p-1.5 border border-gray-100">
            <Image
              src={logos[course.university]}
              alt={course.university}
              fill
              className="object-contain p-1"
            />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gray-50 text-[10px] flex items-center justify-center font-black text-gray-300 uppercase rounded-lg border border-gray-100">
            {course.university.substring(0, 1)}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.2em] leading-none mb-1">
            {course.university}
          </span>
          <span className="text-[9px] font-bold text-gray-400 font-mono">
            {course.courseCode}
          </span>
        </div>
      </div>

      <div className="flex-grow space-y-4 flex flex-col">
        <h3 className="text-base font-black text-gray-900 leading-tight tracking-tight line-clamp-2 group-hover:text-brand-green transition-colors min-h-[3rem]">
          {course.title}
        </h3>

        <div className="mt-auto">
          {(course.gpa || course.score) ? (
            <div className="flex gap-4 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
              {course.gpa && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">GPA</span>
                  <span className="text-sm font-black text-gray-900 italic">{Number(course.gpa).toFixed(2)}</span>
                </div>
              )}
              {course.score && (
                <div className="flex flex-col border-l border-gray-200 pl-4">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">SCORE</span>
                  <span className="text-sm font-black text-gray-900 italic">{Number(course.score).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-4 items-center bg-gray-50/30 p-3 rounded-xl border border-dashed border-gray-100">
               <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">No grades recorded</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-gray-50">
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em] font-mono">
          CERT_ID: {completionId}
        </span>
        <span className="text-[10px] font-black text-brand-green uppercase tracking-widest bg-brand-green/5 px-2 py-1 rounded">
          {masteredLabel || "Mastered"}
        </span>
      </div>
    </div>
  );
}
