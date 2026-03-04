"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import UniversityIcon from "@/components/common/UniversityIcon";
import { PenSquare, Save, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AchievementCardProps {
  course: Course & {gpa?: number;score?: number;attendance?: {attended: number;total: number;};};
  completionDate?: string;
}

export default function AchievementCard({ course }: AchievementCardProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [gpa, setGpa] = useState(course.gpa?.toString() || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingIncomplete, setIsMarkingIncomplete] = useState(false);

  const attendanceRate = course.attendance?.total ?
  Math.round(course.attendance.attended / course.attendance.total * 100) :
  null;

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
          gpa: gpa ? parseFloat(gpa) : 0
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
        body: JSON.stringify({ courseId: course.id, action: "update_progress", progress: 0 })
      });
      if (res.ok) router.refresh();
    } catch (e) {
      console.error("Failed to mark incomplete:", e);
    } finally {
      setIsMarkingIncomplete(false);
    }
  };

  return (
    <>
      {/* Edit Modal */}
      {showEditModal &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border bg-background p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f]">Update performance</h3>
              <p className="text-xs text-[#7a7a7a] mt-1 line-clamp-2">{course.title}</p>
            </div>
            <label className="flex flex-col gap-1.5 mb-4">
              <span className="text-[11px] font-medium text-[#666]">GPA</span>
              <Input
              type="number"
              step="0.01"
              min="0"
              max="5"
              placeholder="0.00"

              value={gpa}
              onChange={(e) => setGpa(e.target.value)} />
            
            </label>
            <div className="flex gap-2">
              <Button variant="outline"
            onClick={() => setShowEditModal(false)}>

              
                Cancel
              </Button>
              <Button variant="outline"
            onClick={handleUpdate}
            disabled={isUpdating}>

              
                {isUpdating ? <Loader2 className="animate-spin" /> : <Save />}
                Save
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Compact card row */}
      <div className="flex items-center gap-2 rounded-sm border p-2">
        <UniversityIcon
          name={course.university}
          size={20}
          className="bg-gray-50 border border-gray-100 flex-shrink-0" />
        

        {/* Course info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#9a9a9a] leading-none mb-0.5">{course.courseCode}</p>
          <p className="text-[13px] font-semibold text-[#1f1f1f] leading-tight truncate">{course.title}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 shrink-0">
          {course.credit &&
          <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">CR</span>
              <span className="text-[11px] font-bold text-[#444]">{course.credit}</span>
            </div>
          }
          <div className="flex flex-col items-center">
            <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">GPA</span>
            <span className="text-[11px] font-bold text-[#444]">{course.gpa ? Number(course.gpa).toFixed(1) : "—"}</span>
          </div>
          {attendanceRate !== null &&
          <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-[#ccc] uppercase tracking-widest">ATT</span>
              <span className="text-[11px] font-bold text-[#444]">{attendanceRate}%</span>
            </div>
          }
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline"
          onClick={() => setShowEditModal(true)}

          aria-label="Edit GPA">
            
            <PenSquare />
          </Button>
          <Button variant="outline" size="icon"
          onClick={handleMarkIncomplete}
          disabled={isMarkingIncomplete}

          aria-label="Mark incomplete">
            
            <RotateCcw />
          </Button>
        </div>
      </div>
    </>);

}
