"use client";

import { useState } from "react";
import { Course } from "@/types";
import { updateCourse, deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";import { Card } from "@/components/ui/card";

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
}

export default function EditCourseModal({ course, onClose }: EditCourseModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    units: course.units || "",
    description: course.description || "",
    url: course.url || "",
    department: course.department || "",
    corequisites: course.corequisites || "",
    prerequisites: course.prerequisites || "",
    resources: course.resources?.join('\n') || "",
    crossListedCourses: course.crossListedCourses || "",
    level: course.level || "undergraduate",
    difficulty: course.difficulty || 0,
    popularity: course.popularity || 0,
    workload: course.workload || 0,
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false
  });
  const textareaClass =
  "w-full border border-[#d8d8d8] bg-white p-3 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        prerequisites: formData.prerequisites || undefined,
        resources: formData.resources ?
        formData.resources.split('\n').map((url) => url.trim()).filter((url) => url.length > 0) :
        undefined,
        crossListedCourses: formData.crossListedCourses || undefined
      };
      await updateCourse(course.id, updateData);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update course", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCourse(course.id);

      const refParams = searchParams.get('refParams');
      if (refParams) {
        router.push(`/courses?${decodeURIComponent(refParams)}`);
      } else {
        router.push("/courses");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete course", { position: "bottom-right" });
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-1 space-y-4 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Core Info - Full Width */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Prerequisites</label>
                <Textarea
              rows={2}
              value={formData.prerequisites}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              className={textareaClass}
              placeholder="e.g., CS101, MATH202" />
            
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Resources (one per line)</label>
                <Textarea
              rows={3}
              value={formData.resources}
              onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
              className={textareaClass} />
            
              </div>
            </div>

            {/* Compact Grid Fields */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Cross-Listed</label>
              <Input
            type="text"
            value={formData.crossListedCourses}
            onChange={(e) => setFormData({ ...formData, crossListedCourses: e.target.value })} />
          
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Corequisites</label>
              <Input
            type="text"
            value={formData.corequisites}
            onChange={(e) => setFormData({ ...formData, corequisites: e.target.value })} />
          
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">URL</label>
              <Input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })} />
          
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Units</label>
              <Input
            type="text"
            value={formData.units}
            onChange={(e) => setFormData({ ...formData, units: e.target.value })} />
          
            </div>

            {/* Numeric Row */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Difficulty (0-10)</label>
                <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: parseFloat(e.target.value) })} />
            
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Popularity</label>
                <Input
              type="number"
              value={formData.popularity}
              onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })} />
            
              </div>
            </div>

            {/* Toggles Row */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Status</label>
                <Card>
                  {[false, true].map((isInternal) =>
              <Button variant="outline"
              key={String(isInternal)}
              type="button"
              onClick={() => setFormData({ ...formData, isInternal: isInternal })}>

                
                      {isInternal ? 'Internal' : 'Public'}
                    </Button>
              )}
                </Card>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Visibility</label>
                <Card>
                  {[false, true].map((isHidden) =>
              <Button variant="outline"
              key={String(isHidden)}
              type="button"
              onClick={() => setFormData({ ...formData, isHidden: isHidden })}>

                
                      {isHidden ? 'Hidden' : 'Visible'}
                    </Button>
              )}
                </Card>
              </div>
            </div>
          </div>

          {/* Actions */}
          <Card>
            <Button variant="outline" size="icon"
        type="button"
        onClick={handleDelete}
        disabled={loading || isDeleting}

        title="Delete Course">
          
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
            <div className="flex gap-3">
              <Button variant="outline"
          type="button"
          onClick={onClose}>

            
                Cancel
              </Button>
              <Button variant="outline"
          type="submit"
          disabled={loading || isDeleting}
          size="sm">
            
                {loading ? <Loader2 className="animate-spin" /> : <><Check /> Save</>}
              </Button>
            </div>
          </Card>
        </form>);

}