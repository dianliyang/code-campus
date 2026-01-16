"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useState } from "react";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  progress?: number;
  dict?: any;
}

export default function CourseCard({ course, isInitialEnrolled, onEnrollToggle, progress, dict }: CourseCardProps) {
  const [isEnrolled, setIsEnrolled] = useState(isInitialEnrolled);
  const [loading, setLoading] = useState(false);

  const logos: Record<string, string> = {
    mit: "/mit.svg", stanford: "/stanford.jpg", cmu: "/cmu.jpg", ucb: "/ucb.png",
  };

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, action: isEnrolled ? 'unenroll' : 'enroll' })
      });
      if (response.ok) {
        setIsEnrolled(!isEnrolled);
        onEnrollToggle?.();
      }
    } catch (e) {
      console.error("Enrollment failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const displayProgress = progress ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all relative overflow-hidden group flex flex-col h-full">
      {/* Enrollment Tag */}
      <button 
        onClick={handleEnroll}
        disabled={loading}
        className={`absolute top-0 right-6 px-4 py-2 rounded-b-lg btn-base ${
          isEnrolled 
            ? 'bg-brand-green text-white translate-y-0' 
            : 'bg-gray-100 text-gray-500 hover:bg-brand-blue hover:text-white -translate-y-1 group-hover:translate-y-0'
        }`}
      >
        {loading ? (
          <i className="fa-solid fa-circle-notch fa-spin"></i>
        ) : isEnrolled ? (
          <span className="flex items-center gap-1"><i className="fa-solid fa-check"></i> {dict?.enrolled || "Enrolled"}</span>
        ) : (
          <span className="flex items-center gap-1"><i className="fa-solid fa-plus"></i> {dict?.enroll || "Join"}</span>
        )}
      </button>

      <div className="flex gap-4 min-w-0">
        {logos[course.university] ? (
          <Image src={logos[course.university]} alt={course.university} width={44} height={44} className="object-contain self-start mt-1" />
        ) : (
          <div className="w-11 h-11 bg-gray-100 text-gray-800 flex items-center justify-center font-bold rounded-lg uppercase text-xs self-start mt-1">{course.university.substring(0, 3)}</div>
        )}
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-2">
            <h4 className="text-xs text-gray-400 font-bold truncate uppercase tracking-widest">{course.university}</h4>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-black">{course.courseCode}</span>
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mt-1 leading-tight group-hover:text-brand-blue transition-colors line-clamp-2 pr-12">
            <a href={course.url} target="_blank" rel="noopener noreferrer">{course.title}</a>
          </h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            {course.fields?.map((f) => (
              <span key={f} className="bg-gray-50 text-gray-500 text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded border border-gray-100">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-50 flex-grow">
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{course.description || `${dict?.view_details_prefix || "View course details and requirements on"} ${course.university}.`}</p>
        {course.corequisites && (
          <p className="text-[9px] font-bold text-brand-blue/60 uppercase tracking-widest mt-4 flex items-center gap-2">
            <i className="fa-solid fa-link text-[8px]"></i>
            {dict?.coreq || "Coreq"}: {course.corequisites}
          </p>
        )}
      </div>

      {isEnrolled && displayProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{dict?.learning_signal || "Learning Signal"}</span>
            <span className="text-[10px] font-black text-brand-blue italic">{displayProgress}%</span>
          </div>
          <div className="flex gap-[2px] items-center w-full">
            {Array.from({ length: 20 }).map((_, i) => {
              const isActive = (i / 20) < (displayProgress / 100);
              return (
                <div 
                  key={i} 
                  className={`flex-grow h-1 rounded-full transition-all duration-500 ${
                    isActive 
                      ? 'bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                      : 'bg-gray-100'
                  }`}
                ></div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-gray-50 pt-6">
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest">
          <div className="flex flex-col -space-y-1">
            <span className="text-[8px] font-black text-gray-300">{dict?.impact || "IMPACT"}</span>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-fire-flame-simple text-orange-500 text-[10px]"></i>
              <span className="text-sm font-black text-gray-900 tracking-tighter italic">{course.popularity}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
            {course.level && (
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                {course.level}
              </span>
            )}
            {course.semesters && course.semesters.length > 0 && (
              <div className="flex gap-2">
                {course.semesters.map(s => (
                  <span key={s} className="bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-tighter border border-gray-100 uppercase">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-brand-blue text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5">
          {dict?.details || "Course Detail"} <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i>
        </a>
      </div>
    </div>
  );
}