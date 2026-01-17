"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  progress?: number;
  dict?: any;
  viewMode?: "list" | "grid";
}

export default function CourseCard({
  course,
  isInitialEnrolled,
  onEnrollToggle,
  progress,
  dict,
  viewMode = "grid",
}: CourseCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEnrolled, setIsEnrolled] = useState(isInitialEnrolled);
  const [loading, setLoading] = useState(false);
  
  const refParams = searchParams.toString();
  const detailHref = `/courses/${course.id}${refParams ? `?refParams=${encodeURIComponent(refParams)}` : ''}`;

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link click if nested
    setLoading(true);
    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: isEnrolled ? "unenroll" : "enroll",
        }),
      });
      if (response.ok) {
        setIsEnrolled(!isEnrolled);
        onEnrollToggle?.();
        router.refresh();
      }
    } catch (e) {
      console.error("Enrollment failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const displayProgress = progress ?? 0;

  if (viewMode === "list") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all relative overflow-hidden group flex items-start gap-6">
        {/* Enrolled Badge - Smaller/Different position for list */}
        <button 
          onClick={handleEnroll}
          disabled={loading}
          className={`absolute top-0 right-4 px-2 py-0.5 rounded-b text-[9px] font-black uppercase tracking-widest transition-all z-10 ${
            isEnrolled 
              ? 'bg-brand-green text-white translate-y-0' 
              : 'bg-gray-100 text-gray-500 hover:bg-brand-dark hover:text-white -translate-y-0.5 group-hover:translate-y-0'
          }`}
        >
          {loading ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : isEnrolled ? (
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-check"></i> {dict?.enrolled || "Added"}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <i className="fa-solid fa-plus"></i> {dict?.enroll || "Join"}
            </span>
          )}
        </button>

        {/* Left: Logo & Basic Info */}
        <div className="flex items-start gap-4 w-1/3 flex-shrink-0">
          <UniversityIcon 
            name={course.university} 
            size={40} 
            className="flex-shrink-0 bg-white rounded-lg p-1 border border-gray-100"
          />
          <div className="min-w-0">
             <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
                {course.university}
              </span>
              <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-black">
                {course.courseCode}
              </span>
            </div>
            <h2 className="text-base font-extrabold text-gray-900 leading-tight line-clamp-2 transition-colors">
              <Link href={detailHref} className="hover:text-brand-blue hover:underline decoration-2 underline-offset-4">
                {course.title}
              </Link>
            </h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {course.fields?.slice(0, 3).map((f) => (
                <span
                  key={f}
                  className="bg-gray-50 text-gray-500 text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded border border-gray-100"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Description */}
        <div className="flex-grow min-w-0 border-l border-gray-100 pl-6 h-full flex flex-col justify-center">
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {course.description || `${dict?.view_details_prefix || "View details on"} ${course.university}.`}
          </p>
          {course.corequisites && (
             <p className="text-[9px] font-bold text-brand-blue/60 uppercase tracking-widest mt-2 flex items-center gap-2 truncate">
              <i className="fa-solid fa-link text-[8px]"></i> {course.corequisites}
            </p>
          )}
        </div>

        {/* Right: Stats & Action */}
        <div className="w-40 flex-shrink-0 flex flex-col items-end justify-between border-l border-gray-100 pl-6 h-full gap-2">
           <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1">
                <i className="fa-solid fa-fire-flame-simple text-orange-500 text-[10px]"></i>
                <span className="text-sm font-black text-gray-900 tracking-tighter italic">
                  {course.popularity}
                </span>
             </div>
             <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Global Interest</span>
           </div>

           <Link
            href={detailHref}
            className="text-brand-blue text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5 mt-auto"
          >
            {dict?.details || "Details"} <i className="fa-solid fa-arrow-right text-[8px]"></i>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all relative overflow-hidden group flex flex-col h-full">
      <button 
        onClick={handleEnroll}
        disabled={loading}
        className={`absolute top-0 right-6 px-3 py-1 rounded-b-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          isEnrolled 
            ? 'bg-brand-green text-white translate-y-0' 
            : 'bg-gray-100 text-gray-500 hover:bg-brand-dark hover:text-white -translate-y-0.5 group-hover:translate-y-0'
        }`}
      >
        {loading ? (
          <i className="fa-solid fa-circle-notch fa-spin"></i>
        ) : isEnrolled ? (
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-check"></i> {dict?.enrolled || "Enrolled"}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-plus"></i> {dict?.enroll || "Join"}
          </span>
        )}
      </button>

      <div className="flex gap-4 min-w-0">
        <UniversityIcon 
          name={course.university} 
          size={44} 
          className="flex-shrink-0 self-start mt-1 bg-white rounded-lg p-1"
        />
        <div className="min-w-0 flex-grow">
          <div className="flex items-center gap-2">
            <h4 className="text-xs text-gray-400 font-bold truncate tracking-widest">
              {course.university}
            </h4>
            {course.isInternal && (
              <span className="text-[8px] font-black bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded uppercase tracking-tighter">
                Internal
              </span>
            )}
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-black">
              {course.courseCode}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 mt-1 leading-tight line-clamp-2 pr-12 transition-colors">
            <Link href={detailHref} className="hover:text-brand-blue hover:underline decoration-2 underline-offset-4">{course.title}</Link>
          </h2>
          <div className="flex gap-2 mt-3 flex-wrap">
            {course.fields?.map((f) => (
              <span
                key={f}
                className="bg-gray-50 text-gray-500 text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded border border-gray-100"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-gray-50 flex-grow">
        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
          {course.description ||
            `${
              dict?.view_details_prefix ||
              "View course details and requirements on"
            } ${course.university}.`}
        </p>
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
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
              {dict?.learning_signal || "Learning Signal"}
            </span>
            <span className="text-[10px] font-black text-brand-blue italic">
              {displayProgress}%
            </span>
          </div>
          <div className="flex gap-[2px] items-center w-full">
            {Array.from({ length: 20 }).map((_, i) => {
              const isActive = i / 20 < displayProgress / 100;
              return (
                <div
                  key={i}
                  className={`flex-grow h-1 rounded-full transition-all duration-500 ${
                    isActive
                      ? "bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                      : "bg-gray-100"
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
            <span className="text-[8px] font-black text-gray-300">
              {dict?.impact || "IMPACT"}
            </span>
            <div className="flex items-center gap-1">
              <i className="fa-solid fa-fire-flame-simple text-orange-500 text-[10px]"></i>
              <span className="text-sm font-black text-gray-900 tracking-tighter italic">
                {course.popularity}
              </span>
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
                {course.semesters.map((s) => (
                  <span
                    key={s}
                    className="bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-tighter border border-gray-100 uppercase"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Link
          href={detailHref}
          className="text-brand-blue text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5"
        >
          {dict?.details || "Course Detail"}{" "}
          <i className="fa-solid fa-arrow-right text-[8px]"></i>
        </Link>
      </div>
    </div>
  );
}
