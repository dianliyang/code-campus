"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toggleProjectSeminarEnrollmentAction } from "@/actions/projects-seminars";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      toast.error(error instanceof Error ? error.message : "Failed to update enrollment", { position: "bottom-right" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button variant="outline" type="button" onClick={handleToggle} disabled={isSubmitting}>
      {isSubmitting ? (
        <Loader2 className="animate-spin"  />
      ) : iconOnly ? (
        isEnrolled ? <Check /> : <Plus />
      ) : (
        isEnrolled ? "Enrolled" : "Enroll"
      )}
    </Button>
  );
}
