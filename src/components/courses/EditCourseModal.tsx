"use client";

import { useState } from "react";
import { Course } from "@/types";
import { updateCourse, deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Loader2, Check, Trash2 } from "lucide-react";

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
    university: course.university,
    courseCode: course.courseCode,
    title: course.title,
    units: course.units || "",
    description: course.description || "",
    url: course.url || "",
    department: course.department || "",
    corequisites: course.corequisites || "",
    level: course.level || "undergraduate",
    difficulty: course.difficulty || 0,
    popularity: course.popularity || 0,
    workload: course.workload || "",
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false,
    details: {
      prerequisites: course.details?.prerequisites || "",
      relatedUrls: course.details?.relatedUrls?.join('\n') || "",
      crossListedCourses: course.details?.crossListedCourses || "",
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData = {
        ...formData,
        details: {
          prerequisites: formData.details.prerequisites || undefined,
          relatedUrls: formData.details.relatedUrls
            ? formData.details.relatedUrls.split('\n').map(url => url.trim()).filter(url => url.length > 0)
            : undefined,
          crossListedCourses: formData.details.crossListedCourses || undefined,
        },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Edit Course
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Core Info - Full Width */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prerequisites</label>
                <textarea
                  rows={2}
                  value={formData.details.prerequisites}
                  onChange={(e) => setFormData({ ...formData, details: { ...formData.details, prerequisites: e.target.value } })}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all"
                  placeholder="e.g., CS101, MATH202"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Related URLs (one per line)</label>
                <textarea
                  rows={3}
                  value={formData.details.relatedUrls}
                  onChange={(e) => setFormData({ ...formData, details: { ...formData.details, relatedUrls: e.target.value } })}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-brand-blue/10 focus:border-brand-blue outline-none transition-all"
                />
              </div>
            </div>

            {/* Compact Grid Fields */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cross-Listed</label>
              <input
                type="text"
                value={formData.details.crossListedCourses}
                onChange={(e) => setFormData({ ...formData, details: { ...formData.details, crossListedCourses: e.target.value } })}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Corequisites</label>
              <input
                type="text"
                value={formData.corequisites}
                onChange={(e) => setFormData({ ...formData, corequisites: e.target.value })}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Units</label>
              <input
                type="text"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
              />
            </div>

            {/* Numeric Row */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Difficulty (0-10)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseFloat(e.target.value) })}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Popularity</label>
                <input
                  type="number"
                  value={formData.popularity}
                  onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none"
                />
              </div>
            </div>

            {/* Toggles Row */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 w-full">
                  {[false, true].map(isInternal => (
                    <button
                      key={String(isInternal)}
                      type="button"
                      onClick={() => setFormData({...formData, isInternal: isInternal})}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${formData.isInternal === isInternal ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {isInternal ? 'Internal' : 'Public'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Visibility</label>
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200 w-full">
                  {[false, true].map(isHidden => (
                    <button
                      key={String(isHidden)}
                      type="button"
                      onClick={() => setFormData({...formData, isHidden: isHidden})}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${formData.isHidden === isHidden ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4 mt-auto">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || isDeleting}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
              title="Delete Course"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isDeleting}
                className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Save</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
