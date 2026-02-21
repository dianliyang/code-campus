"use client";

import { useState } from "react";
import { Course } from "@/types";
import { updateCourse, deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    relatedUrls: course.relatedUrls?.join('\n') || "",
    crossListedCourses: course.crossListedCourses || "",
    level: course.level || "undergraduate",
    difficulty: course.difficulty || 0,
    popularity: course.popularity || 0,
    workload: course.workload || "",
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false,
  });
  const inputClass =
    "h-8 w-full rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";
  const textareaClass =
    "w-full rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        prerequisites: formData.prerequisites || undefined,
        relatedUrls: formData.relatedUrls
          ? formData.relatedUrls.split('\n').map(url => url.trim()).filter(url => url.length > 0)
          : undefined,
        crossListedCourses: formData.crossListedCourses || undefined,
      };
      await updateCourse(course.id, updateData);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to update course");
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
      alert("Failed to delete course");
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
                <textarea
                  rows={2}
                  value={formData.prerequisites}
                  onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                  className={textareaClass}
                  placeholder="e.g., CS101, MATH202"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Related URLs (one per line)</label>
                <textarea
                  rows={3}
                  value={formData.relatedUrls}
                  onChange={(e) => setFormData({ ...formData, relatedUrls: e.target.value })}
                  className={textareaClass}
                />
              </div>
            </div>

            {/* Compact Grid Fields */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Cross-Listed</label>
              <input
                type="text"
                value={formData.crossListedCourses}
                onChange={(e) => setFormData({ ...formData, crossListedCourses: e.target.value })}
                className={inputClass}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Corequisites</label>
              <input
                type="text"
                value={formData.corequisites}
                onChange={(e) => setFormData({ ...formData, corequisites: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#666]">Units</label>
              <input
                type="text"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Numeric Row */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Difficulty (0-10)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseFloat(e.target.value) })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Popularity</label>
                <input
                  type="number"
                  value={formData.popularity}
                  onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Toggles Row */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Status</label>
                <div className="flex bg-[#f6f6f6] p-1 rounded-md border border-[#d8d8d8] w-full">
                  {[false, true].map(isInternal => (
                    <button
                      key={String(isInternal)}
                      type="button"
                      onClick={() => setFormData({...formData, isInternal: isInternal})}
                      className={`flex-1 h-7 rounded text-[12px] font-medium transition-colors ${formData.isInternal === isInternal ? 'bg-white text-[#222] border border-[#e1e1e1]' : 'text-[#777] hover:text-[#555]'}`}
                    >
                      {isInternal ? 'Internal' : 'Public'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#666]">Visibility</label>
                <div className="flex bg-[#f6f6f6] p-1 rounded-md border border-[#d8d8d8] w-full">
                  {[false, true].map(isHidden => (
                    <button
                      key={String(isHidden)}
                      type="button"
                      onClick={() => setFormData({...formData, isHidden: isHidden})}
                      className={`flex-1 h-7 rounded text-[12px] font-medium transition-colors ${formData.isHidden === isHidden ? 'bg-white text-red-600 border border-[#f0c9c9]' : 'text-[#777] hover:text-[#555]'}`}
                    >
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#e5e5e5] flex items-center justify-between gap-4 mt-auto">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || isDeleting}
              className="h-8 w-8 rounded-md border border-[#e2bcbc] bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
              title="Delete Course"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={loading || isDeleting}
                size="sm"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Save</>}
              </Button>
            </div>
          </div>
        </form>
  );
}
