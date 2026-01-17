"use client";

import { useState } from "react";
import { Course } from "@/types";
import { updateCourse } from "@/actions/courses";

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
}

export default function EditCourseModal({ course, onClose }: EditCourseModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: course.title,
    courseCode: course.courseCode,
    description: course.description || "",
    url: course.url || "",
    level: course.level || "",
    workload: course.workload || "",
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Description
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-medium text-gray-700 transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary py-4 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
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
        </form>
      </div>
    </div>
  );
}
