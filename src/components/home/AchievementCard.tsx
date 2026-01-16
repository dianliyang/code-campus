"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useEffect, useState } from "react";

interface AchievementCardProps {
  course: Course;
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
    mit: "/mit.svg",
    stanford: "/stanford.jpg",
    cmu: "/cmu.jpg",
    ucb: "/ucb.png",
  };

  return (
    <div className="bg-white border border-gray-100 p-5 flex flex-col gap-4 h-full relative group">
      {/* Tiny Status Dot */}
      <div className="absolute top-5 right-5 w-1.5 h-1.5 bg-brand-green rounded-full"></div>

      <div className="flex items-center gap-3">
        {logos[course.university] ? (
          <div className="w-8 h-8 relative">
            <Image
              src={logos[course.university]}
              alt={course.university}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="w-8 h-8 bg-gray-50 text-[10px] flex items-center justify-center font-black text-gray-300 uppercase">
            {course.university.substring(0, 1)}
          </div>
        )}
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {course.university}
        </span>
      </div>

      <div className="flex-grow">
        <h3 className="text-sm font-black text-gray-900 leading-tight uppercase tracking-tight line-clamp-2">
          {course.title}
        </h3>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
          #{completionId}
        </span>
        <span className="text-[9px] font-black text-brand-green uppercase tracking-widest">
          {masteredLabel || "Mastered"}
        </span>
      </div>
    </div>
  );
}
