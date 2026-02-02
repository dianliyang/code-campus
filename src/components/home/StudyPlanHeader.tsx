"use client";

import { Dictionary } from "@/lib/dictionary";

interface StudyPlanHeaderProps {
  enrolledCount: number;
  completedCount: number;
  averageProgress: number;
  attendance?: { attended: number; total: number };
  dict: Dictionary['dashboard']['roadmap'];
}

export default function StudyPlanHeader({ enrolledCount, completedCount, averageProgress, attendance, dict }: StudyPlanHeaderProps) {
  return (
    <div className="relative mb-32">
      <div className="absolute -left-12 top-0 bottom-0 w-px bg-gray-100 hidden lg:block"></div>
      
      <div className="flex flex-col lg:flex-row lg:items-end gap-16 lg:gap-32">
        <div>
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter leading-none uppercase">
            {dict?.title?.split(' ')[0] || "Study"} <br /> <span className="text-brand-blue">{dict?.title?.split(' ')[1] || "Path"}</span>
          </h1>
        </div>

        <div className="flex-grow flex flex-col sm:flex-row gap-16 sm:items-center relative z-10 min-w-0">
          <div className="relative pt-10 flex-grow min-w-0">
            <span className="absolute top-0 left-0 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
              {dict?.learning_sequence || "Learning Sequence"}
            </span>
            <div className={`flex ${enrolledCount > 30 ? 'gap-1' : 'gap-2'} items-end h-16 mb-6 overflow-x-auto no-scrollbar pb-2`}>
              {Array.from({ length: Math.max(enrolledCount, 12) }).map((_, i) => (
                <div 
                  key={i} 
                  className={`${enrolledCount > 30 ? 'w-1' : 'w-1.5'} flex-shrink-0 rounded-full transition-all duration-700 ${
                    i < completedCount 
                      ? 'h-16 bg-brand-green shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                      : i < enrolledCount 
                        ? 'h-10 bg-brand-blue/40' 
                        : 'h-3 bg-gray-100'
                  }`}
                ></div>
              ))}
            </div>
            <div className="flex gap-12">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {dict?.header_total || "Total Tracks"}
                </span>
                <span className="text-3xl font-black text-gray-900 leading-none mt-2">{enrolledCount}</span>
              </div>
              <div className="flex flex-col border-l-2 border-gray-100 pl-10">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {dict?.header_mastered || "Mastered"}
                </span>
                <span className="text-3xl font-black text-brand-green leading-none mt-2">{completedCount}</span>
              </div>
              {attendance && attendance.total > 0 && (
                <div className="flex flex-col border-l-2 border-gray-100 pl-10">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Attendance
                  </span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-gray-900 leading-none">{attendance.attended}</span>
                    <span className="text-lg font-bold text-gray-300">/{attendance.total}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative pt-10 sm:ml-auto">
            <span className="absolute top-0 left-0 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">
              {dict?.header_efficiency || "Core Efficiency"}
            </span>
            <div className="flex items-center gap-10">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-gray-100" />
                  <circle 
                    cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="6" 
                    strokeDasharray={276.46}
                    strokeDashoffset={276.46 - (276.46 * averageProgress) / 100}
                    className="text-brand-blue transition-all duration-1000 ease-out shadow-lg"
                  />
                </svg>
                <span className="absolute text-xl font-black text-gray-900 italic tracking-tighter">
                  {averageProgress}%
                </span>
              </div>
              <div className="max-w-[160px]">
                <p className="text-xs text-gray-400 font-bold leading-relaxed uppercase tracking-widest">
                  {dict?.efficiency_desc || "Curriculum absorption rate across active tracks."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
