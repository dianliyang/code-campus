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
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">
            Edit Course
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="space-y-12">

            {/* Editable Course Details */}
            <div className="space-y-8">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Course Details</h3>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Prerequisites
                </label>
                <textarea
                  rows={3}
                  value={formData.details.prerequisites}
                  onChange={(e) => setFormData({ ...formData, details: { ...formData.details, prerequisites: e.target.value } })}
                  placeholder="e.g., CS101, MATH202"
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none text-sm font-medium transition-all focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Related URLs
                  <span className="text-gray-300 ml-2 font-normal normal-case">(one per line)</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.details.relatedUrls}
                  onChange={(e) => setFormData({ ...formData, details: { ...formData.details, relatedUrls: e.target.value } })}
                  placeholder="https://example.com/syllabus&#10;https://example.com/resources"
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none text-sm font-medium transition-all focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20 font-mono"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Cross-Listed Courses
                </label>
                <input
                  type="text"
                  value={formData.details.crossListedCourses}
                  onChange={(e) => setFormData({ ...formData, details: { ...formData.details, crossListedCourses: e.target.value } })}
                  placeholder="e.g., ECE15-213, INI15-213"
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none text-sm font-medium transition-all focus:ring-4 focus:ring-brand-blue/5 focus:bg-white focus:border-brand-blue/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col gap-3 group">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                  Corequisites
                </label>
                <input
                  type="text"
                  value={formData.corequisites}
                  onChange={(e) => setFormData({ ...formData, corequisites: e.target.value })}
                  className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                />
              </div>
              <div className="flex flex-col gap-3 group">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                  Course URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col gap-3 group">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                  Units
                </label>
                <input
                  type="text"
                  value={formData.units}
                  onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                  placeholder="e.g., 3-0-1"
                  className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                />
              </div>
              <div className="flex flex-col gap-3 group">
                 <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] text-gray-300">
                   Workload (Read Only)
                 </label>
                 <input
                   type="text"
                   value={formData.workload}
                   readOnly
                   disabled
                   className="bg-transparent border-b-2 border-gray-100 text-gray-400 cursor-not-allowed outline-none py-3 text-sm font-bold transition-all"
                 />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] text-gray-300">
                  Level (Read Only)
                </label>
                <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100 opacity-60 pointer-events-none grayscale">
                  {['undergraduate', 'graduate'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-default ${formData.level === lvl ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col gap-3 group">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                  Difficulty (0-10)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: parseFloat(e.target.value) })}
                  className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                />
              </div>
              <div className="flex flex-col gap-3 group">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] group-focus-within:text-brand-blue transition-colors">
                  Popularity
                </label>
                <input
                  type="number"
                  value={formData.popularity}
                  onChange={(e) => setFormData({ ...formData, popularity: parseInt(e.target.value) })}
                  className="bg-transparent border-b-2 border-gray-100 focus:border-brand-blue outline-none py-3 text-sm font-bold transition-all placeholder:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Internal Status
                </label>
                <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100">
                  {[false, true].map(isInternal => (
                    <button
                      key={String(isInternal)}
                      type="button"
                      onClick={() => setFormData({...formData, isInternal: isInternal})}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.isInternal === isInternal ? 'bg-white text-brand-blue shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {isInternal ? 'Internal' : 'Public'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                  Visibility
                </label>
                <div className="flex bg-gray-50 p-1 rounded-xl gap-1 w-fit border border-gray-100">
                  {[false, true].map(isHidden => (
                    <button
                      key={String(isHidden)}
                      type="button"
                      onClick={() => setFormData({...formData, isHidden: isHidden})}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.isHidden === isHidden ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-gray-100 flex flex-col gap-4">
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
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    Save Changes <Check className="w-3 h-3" />
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
                  <Loader2 className="w-3 h-3 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" /> Delete Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
