"use client";

import { Dictionary } from "@/lib/dictionary";

interface StudyPlanHeaderProps {
  enrolledCount: number;
  completedCount: number;
  totalCredits: number;
  averageProgress: number;
  attendance?: { attended: number; total: number };
  dict: Dictionary['dashboard']['roadmap'];
}

export default function StudyPlanHeader({ enrolledCount, completedCount, totalCredits, averageProgress, attendance, dict }: StudyPlanHeaderProps) {
  const attendanceRate = attendance && attendance.total > 0 
    ? Math.round((attendance.attended / attendance.total) * 100) 
    : 0;

  return (
    <div className="relative mb-24 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 md:gap-12">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-1.5 md:w-2 h-8 md:h-10 bg-gray-900 rounded-full"></div>
            <h1 className="text-4xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none uppercase">
              {dict?.title?.split(' ')[0] || "STUDY"} <br /> 
              <span className="text-brand-blue tracking-[-0.05em]">{dict?.title?.split(' ')[1] || "PLAN"}</span>
            </h1>
          </div>
          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] md:tracking-[0.4em] ml-3 md:ml-5">
            {dict?.learning_sequence || "ACADEMIC_TRAJECTORY_v2.0"}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-10 flex-grow max-w-4xl">
          {/* Metric Node 01 */}
          <div className="relative group">
            <span className="absolute -top-5 md:-top-6 left-0 text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-brand-blue transition-colors">
              01_CAPACITY
            </span>
            <div className="flex flex-col">
              <span className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-1 md:mb-2">
                {enrolledCount}
              </span>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {dict?.header_total || "Active Tracks"}
              </span>
            </div>
          </div>

          {/* Metric Node 02 */}
          <div className="relative group border-l border-gray-100 pl-4 md:pl-8">
            <span className="absolute -top-5 md:-top-6 left-4 md:left-8 text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-brand-green transition-colors">
              02_MASTERY
            </span>
            <div className="flex flex-col">
              <span className="text-3xl md:text-5xl font-black text-brand-green tracking-tighter leading-none mb-1 md:mb-2">
                {completedCount}
              </span>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {dict?.header_mastered || "Completed"}
              </span>
            </div>
          </div>

          {/* Metric Node 03 */}
          <div className="relative group md:border-l border-gray-100 md:pl-8">
            <span className="absolute -top-5 md:-top-6 left-0 md:left-8 text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-violet-500 transition-colors">
              03_CREDITS
            </span>
            <div className="flex flex-col">
              <span className="text-3xl md:text-5xl font-black text-violet-600 tracking-tighter leading-none mb-1 md:mb-2">
                {totalCredits}
              </span>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Total Units
              </span>
            </div>
          </div>

          {/* Metric Node 04 */}
          <div className="relative group border-l border-gray-100 pl-4 md:pl-8">
            <span className="absolute -top-5 md:-top-6 left-4 md:left-8 text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest group-hover:text-brand-blue transition-colors">
              04_RELIABILITY
            </span>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 mb-1 md:mb-2">
                <span className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none">
                  {attendanceRate}
                </span>
                <span className="text-base md:text-xl font-black text-gray-300 italic">%</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Attendance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Sequence Bar */}
      <div className="mt-16 relative">
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-100 -z-10"></div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
          {Array.from({ length: Math.max(enrolledCount, 24) }).map((_, i) => {
            const isFilled = i < enrolledCount;
            const isCompleted = i < completedCount;
            return (
              <div 
                key={i}
                className={`flex-shrink-0 transition-all duration-700 ${
                  isCompleted 
                    ? "w-2.5 h-6 bg-brand-green" 
                    : isFilled 
                      ? "w-2.5 h-4 bg-brand-blue/30" 
                      : "w-2.5 h-1.5 bg-gray-100"
                } ${i === completedCount && isFilled ? "animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" : ""}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

