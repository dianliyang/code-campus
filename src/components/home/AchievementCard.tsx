"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useEffect, useState } from "react";

interface AchievementCardProps {
  course: Course & { gpa?: number; score?: number };
  completionDate?: string;
  masteredLabel?: string;
}

export default function AchievementCard({ course, masteredLabel }: AchievementCardProps) {
  const [completionId, setCompletionId] = useState("");

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

  return (
    <div className="bg-white border border-gray-100 p-6 flex flex-col gap-5 h-full relative group hover:border-brand-green/30 transition-all hover:shadow-xl hover:shadow-brand-green/5 rounded-2xl">
      {/* Tiny Status Dot */}
      <div className="absolute top-6 right-6 w-2 h-2 bg-brand-green rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>

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

      <div className="flex-grow space-y-4">
        <h3 className="text-base font-black text-gray-900 leading-tight tracking-tight line-clamp-2 group-hover:text-brand-green transition-colors">
          {course.title}
        </h3>

        {(course.gpa || course.score) && (
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
        )}
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
