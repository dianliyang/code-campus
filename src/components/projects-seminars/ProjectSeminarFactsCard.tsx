"use client";

import { useEffect, useState } from "react";

interface ProjectSeminarFactsCardProps {
  category: string;
  department: string;
  credit: number | null;
  semesterLabel: string;
  instructors: string[];
}

export default function ProjectSeminarFactsCard({
  category,
  department,
  credit,
  semesterLabel,
  instructors,
}: ProjectSeminarFactsCardProps) {
  const [cardMinHeight, setCardMinHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      const header = document.querySelector<HTMLElement>("[data-project-seminar-title-header]");
      if (!header) return;
      setCardMinHeight(header.offsetHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [category, department, credit, semesterLabel, instructors.length]);

  return (
    <div
      className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4"
      style={cardMinHeight ? { minHeight: `${cardMinHeight}px` } : undefined}
    >
      <h2 className="text-base font-semibold text-[#2a2a2a] mb-3">Facts</h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[#666]">Category</dt>
          <dd className="text-right text-[#222]">{category || "-"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#666]">Department</dt>
          <dd className="text-right text-[#222]">{department}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#666]">Credit</dt>
          <dd className="text-right text-[#222]">{credit ?? "-"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#666]">Semester</dt>
          <dd className="text-right text-[#222]">{semesterLabel}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[#666]">Instructors</dt>
          <dd className="text-[#222]">
            {instructors.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1">
                {instructors.map((name, idx) => (
                  <li key={`${name}-${idx}`}>{name}</li>
                ))}
              </ul>
            ) : (
              "-"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
