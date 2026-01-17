"use client";

import { useState } from "react";
import { Course } from "@/types";
import { updateCourse, deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";

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
    level: course.level || "",
    difficulty: course.difficulty || 0,
    popularity: course.popularity || 0,
    workload: course.workload || "",
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCourse(course.id, formData);
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
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">
            Edit Course
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Row 1: University & Course Code */}
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                University
              </label>
              <input
                type="text"
                required
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Course Code
              </label>
              <input
                type="text"
                required
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 2: Title (Full Width) */}
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Course Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 3: Department & Units */}
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Units
              </label>
              <input
                type="text"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 4: Description (Full Width) */}
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-medium text-gray-700 transition-all resize-none"
              />
            </div>

            {/* Row 5: Corequisites (Full Width) */}
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Corequisites
              </label>
              <input
                type="text"
                value={formData.corequisites}
                onChange={(e) => setFormData({ ...formData, corequisites: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 6: URL (Full Width) */}
            <div className="space-y-2 col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Course URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 7: Level & Workload */}
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Level
              </label>
              <input
                type="text"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Workload
              </label>
              <input
                type="text"
                value={formData.workload}
                onChange={(e) => setFormData({ ...formData, workload: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>

            {/* Row 8: Difficulty & Popularity */}
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Difficulty (0-10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: parseFloat(e.target.value) })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Popularity
              </label>
              <input
                type="number"
                value={formData.popularity}
                onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })}
                className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-bold text-gray-900 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-8 pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.isInternal}
                  onChange={(e) => setFormData({ ...formData, isInternal: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
              </div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">
                Internal Course
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.isHidden}
                  onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </div>
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">
                Hidden
              </span>
            </label>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isDeleting}
                className="flex-1 btn-primary py-4 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                  <>
                    Save Changes <i className="fa-solid fa-check"></i>
                  </>
                )}
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || isDeleting}
              className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Deleting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-trash"></i> Delete Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
