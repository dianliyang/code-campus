"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/types";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import FormattedDescription from "@/components/courses/FormattedDescription";
import { regenerateCourseDescription, updateCourseDescription, updateCourseFull } from "@/actions/courses";
import { Loader2, Plus, Sparkles, X } from "lucide-react";

export interface EditableStudyPlan {
  id?: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  type: string;
}

interface CourseDetailTopSectionProps {
  course: Course;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

const AI_DESCRIPTION_MARK = "AI Regenerated";

function normalizeTime(value: string) {
  if (!value) return "09:00:00";
  return value.length === 5 ? `${value}:00` : value;
}

function appendAiDescriptionMark(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.toLowerCase().endsWith(AI_DESCRIPTION_MARK.toLowerCase())) {
    return trimmed;
  }
  return `${trimmed}\n\n${AI_DESCRIPTION_MARK}`;
}

export default function CourseDetailTopSection({
  course,
  descriptionEmptyText,
  availableTopics,
  availableSemesters,
  studyPlans,
  isEditing,
  onEditingChange,
}: CourseDetailTopSectionProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [description, setDescription] = useState(course.description || "");
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isApplyingGeneratedDescription, setIsApplyingGeneratedDescription] = useState(false);

  const [formData, setFormData] = useState({
    university: course.university || "",
    courseCode: course.courseCode || "",
    title: course.title || "",
    units: course.units || "",
    credit: course.credit?.toString() || "",
    description: course.description || "",
    url: course.url || "",
    department: course.department || "",
    corequisites: course.corequisites || "",
    prerequisites: course.prerequisites || "",
    relatedUrlsText: (course.relatedUrls || []).join("\n"),
    crossListedCourses: course.crossListedCourses || "",
    level: course.level || "",
    difficulty: String(course.difficulty ?? 0),
    popularity: String(course.popularity ?? 0),
    workload: course.workload || "",
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false,
    detailsJson: JSON.stringify(course.details || {}, null, 2),
    instructorsText: (course.instructors || []).join(", "),
    topicsText: (course.fields || []).join(", "),
    semestersText: (course.semesters || []).join(", "),
  });

  const [editablePlans, setEditablePlans] = useState<EditableStudyPlan[]>(studyPlans);
  const [removedPlanIds, setRemovedPlanIds] = useState<number[]>([]);

  const allTopicOptions = useMemo(
    () => Array.from(new Set([...(availableTopics || []), ...(course.fields || [])])).sort(),
    [availableTopics, course.fields],
  );

  const allSemesterOptions = useMemo(
    () => Array.from(new Set([...(availableSemesters || []), ...(course.semesters || [])])).sort(),
    [availableSemesters, course.semesters],
  );

  const handleToggleEdit = () => {
    onEditingChange(!isEditing);
  };

  const handleAddStudyPlan = () => {
    setEditablePlans((prev) => [
      ...prev,
      {
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        daysOfWeek: [1, 3, 5],
        startTime: "09:00:00",
        endTime: "11:00:00",
        location: "Home",
        type: "",
      },
    ]);
  };

  const handleRemoveStudyPlan = (index: number) => {
    setEditablePlans((prev) => {
      const target = prev[index];
      if (target?.id) {
        setRemovedPlanIds((ids) => [...ids, target.id as number]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCourseFull(course.id, {
        university: formData.university,
        courseCode: formData.courseCode,
        title: formData.title,
        units: formData.units,
        credit: formData.credit.trim() ? Number(formData.credit) : null,
        description: formData.description,
        url: formData.url,
        department: formData.department,
        corequisites: formData.corequisites,
        prerequisites: formData.prerequisites,
        relatedUrls: formData.relatedUrlsText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        crossListedCourses: formData.crossListedCourses,
        level: formData.level,
        difficulty: Number(formData.difficulty || 0),
        popularity: Number(formData.popularity || 0),
        workload: formData.workload,
        isHidden: formData.isHidden,
        isInternal: formData.isInternal,
        detailsJson: formData.detailsJson,
        instructors: formData.instructorsText
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        topics: formData.topicsText
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        semesters: formData.semestersText
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        studyPlans: editablePlans,
        removedStudyPlanIds: removedPlanIds,
      });
      setRemovedPlanIds([]);
      onEditingChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update course details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateDescription = async () => {
    setIsGeneratingDescription(true);
    try {
      const regenerated = (await regenerateCourseDescription(course.id)).trim();
      if (!regenerated) {
        throw new Error("AI returned an empty description");
      }
      setGeneratedDescription(regenerated);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to regenerate description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleConfirmGeneratedDescription = async () => {
    if (!generatedDescription) return;
    setIsApplyingGeneratedDescription(true);
    try {
      const markedDescription = appendAiDescriptionMark(generatedDescription);
      await updateCourseDescription(course.id, markedDescription);
      setDescription(markedDescription);
      setFormData((p) => ({ ...p, description: markedDescription }));
      setGeneratedDescription(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to update course description");
    } finally {
      setIsApplyingGeneratedDescription(false);
    }
  };

  const handleDiscardGeneratedDescription = () => {
    setGeneratedDescription(null);
  };

  return (
    <>
      <CourseDetailHeader course={course} isEditing={isEditing} onToggleEdit={handleToggleEdit} />

      <section>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">About this Course</h2>
          <button
            type="button"
            onClick={handleRegenerateDescription}
            disabled={isSaving || isGeneratingDescription}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="AI Regenerate Description"
          >
            {isGeneratingDescription ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            AI
          </button>
        </div>
        {!isEditing ? (
          <>
            {generatedDescription && (
              <div className="mb-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                  AI Description Generated
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmGeneratedDescription}
                    disabled={isApplyingGeneratedDescription}
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isApplyingGeneratedDescription && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardGeneratedDescription}
                    disabled={isApplyingGeneratedDescription}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            <div className="prose prose-lg prose-gray max-w-none prose-p:text-gray-600 prose-p:leading-8">
              {(generatedDescription || description) ? (
                <FormattedDescription text={generatedDescription || description} />
              ) : (
                <p className="text-gray-500 italic">{descriptionEmptyText}</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={formData.university} onChange={(e) => setFormData((p) => ({ ...p, university: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="University" />
              <input value={formData.courseCode} onChange={(e) => setFormData((p) => ({ ...p, courseCode: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Course code" />
              <input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Title" />
              <input value={formData.url} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="URL" />
              <input value={formData.units} onChange={(e) => setFormData((p) => ({ ...p, units: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Units" />
              <input value={formData.credit} onChange={(e) => setFormData((p) => ({ ...p, credit: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Credit" />
              <input value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Department" />
              <input value={formData.level} onChange={(e) => setFormData((p) => ({ ...p, level: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Level" />
              <input value={formData.corequisites} onChange={(e) => setFormData((p) => ({ ...p, corequisites: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Corequisites" />
              <input value={formData.prerequisites} onChange={(e) => setFormData((p) => ({ ...p, prerequisites: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Prerequisites" />
              <input value={formData.crossListedCourses} onChange={(e) => setFormData((p) => ({ ...p, crossListedCourses: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Cross-listed courses" />
              <input value={formData.workload} onChange={(e) => setFormData((p) => ({ ...p, workload: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Workload" />
              <input value={formData.difficulty} onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Difficulty" />
              <input value={formData.popularity} onChange={(e) => setFormData((p) => ({ ...p, popularity: e.target.value }))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Popularity" />
              <input value={formData.instructorsText} onChange={(e) => setFormData((p) => ({ ...p, instructorsText: e.target.value }))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Instructors (comma-separated)" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Related URLs (one per line)</label>
              <textarea
                value={formData.relatedUrlsText}
                onChange={(e) => setFormData((p) => ({ ...p, relatedUrlsText: e.target.value }))}
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm font-mono"
              />
            </div>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={10}
              className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm"
              placeholder="Description"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Topics (course_fields)</label>
                <input
                  value={formData.topicsText}
                  onChange={(e) => setFormData((p) => ({ ...p, topicsText: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Machine Learning, Algorithms"
                />
                <p className="text-[11px] text-gray-400">Available: {allTopicOptions.join(", ") || "-"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Semesters (course_semesters)</label>
                <input
                  value={formData.semestersText}
                  onChange={(e) => setFormData((p) => ({ ...p, semestersText: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Fall 2025, Spring 2026"
                />
                <p className="text-[11px] text-gray-400">Available: {allSemesterOptions.join(", ") || "-"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isInternal}
                  onChange={(e) => setFormData((p) => ({ ...p, isInternal: e.target.checked }))}
                />
                Internal
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isHidden}
                  onChange={(e) => setFormData((p) => ({ ...p, isHidden: e.target.checked }))}
                />
                Hidden
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Details JSON (courses.details)</label>
              <textarea
                value={formData.detailsJson}
                onChange={(e) => setFormData((p) => ({ ...p, detailsJson: e.target.value }))}
                rows={12}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm font-mono"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">Study Plans (study_plans)</h3>
                <button type="button" onClick={handleAddStudyPlan} className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Add Plan
                </button>
              </div>

              {editablePlans.length === 0 && (
                <p className="text-sm text-gray-400">No study plans</p>
              )}

              {editablePlans.map((plan, index) => (
                <div key={plan.id ?? `new-${index}`} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="date" value={plan.startDate} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, startDate: e.target.value } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="date" value={plan.endDate} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, endDate: e.target.value } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={plan.daysOfWeek.join(",")} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, daysOfWeek: e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)) } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Days (0-6), e.g. 1,3,5" />
                    <input value={plan.location} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, location: e.target.value } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Location" />
                    <input type="time" value={plan.startTime.slice(0, 5)} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, startTime: normalizeTime(e.target.value) } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="time" value={plan.endTime.slice(0, 5)} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, endTime: normalizeTime(e.target.value) } : p))} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <input value={plan.type || ""} onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === index ? { ...p, type: e.target.value } : p))} className="md:col-span-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Type" />
                  </div>
                  <button type="button" onClick={() => handleRemoveStudyPlan(index)} className="text-xs font-bold uppercase tracking-wider text-red-500 inline-flex items-center gap-1">
                    <X className="w-3 h-3" />
                    Remove Plan
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save All
              </button>
              <button
                type="button"
                onClick={handleToggleEdit}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
