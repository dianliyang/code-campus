"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toggleProjectSeminarEnrollmentAction } from "@/actions/projects-seminars";

interface ProjectSeminarEnrollButtonProps {
  projectSeminarId: number;
  initialEnrolled: boolean;
  iconOnly?: boolean;
}

export default function ProjectSeminarEnrollButton({
  projectSeminarId,
  initialEnrolled,
  iconOnly = false,
}: ProjectSeminarEnrollButtonProps) {
  const [isEnrolled, setIsEnrolled] = useState(initialEnrolled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async () => {
    setIsSubmitting(true);
    try {
      await toggleProjectSeminarEnrollmentAction(projectSeminarId, isEnrolled);
      setIsEnrolled((prev) => !prev);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update enrollment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`inline-flex h-8 items-center justify-center rounded-md border ${iconOnly ? "w-8 px-0" : "px-2.5"} text-[13px] font-medium transition-colors disabled:opacity-50 ${
        isEnrolled
          ? "border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
          : "border-[#d3d3d3] bg-white text-[#3b3b3b] hover:bg-[#f8f8f8]"
      }`}
      title={isEnrolled ? "Unenroll" : "Enroll"}
      aria-label={isEnrolled ? "Unenroll" : "Enroll"}
    >
      {isSubmitting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : iconOnly ? (
        isEnrolled ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
      ) : (
        isEnrolled ? "Enrolled" : "Enroll"
      )}
    </button>
  );
}
