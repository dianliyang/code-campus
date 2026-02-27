"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/types";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import FormattedDescription from "@/components/courses/FormattedDescription";
import { regenerateCourseDescription, updateCourseDescription, updateCourseFull } from "@/actions/courses";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EditableStudyPlan {
  id?: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  kind: string;
}

interface CourseDetailTopSectionProps {
  course: Course;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  projectSeminarRef?: { id: number; category: string } | null;
  showHeader?: boolean;
}

const AI_DESCRIPTION_MARK = "AI Regenerated";
const CAU_CATEGORY_OPTIONS = [
  { value: "Theoretical Computer Science", label: "Theoretical" },
  { value: "Compulsory elective modules in Computer Science", label: "Compulsory elective" },
  { value: "Advanced Project", label: "Project" },
  { value: "Seminar", label: "Seminar" },
];

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
  projectSeminarRef = null,
  showHeader = true,
}: CourseDetailTopSectionProps) {
  const inputClass =
    "h-8 w-full rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";
  const textareaClass =
    "w-full rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [description, setDescription] = useState(course.description || "");
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isApplyingGeneratedDescription, setIsApplyingGeneratedDescription] = useState(false);
  const hasAiRegenerated = (description || "").toLowerCase().includes(AI_DESCRIPTION_MARK.toLowerCase());

  const [formData, setFormData] = useState({
    units: course.units || "",
    credit: course.credit?.toString() || "",
    description: course.description || "",
    url: course.url || "",
    department: course.department || "",
    corequisites: course.corequisites || "",
    prerequisites: course.prerequisites || "",
    resourcesText: (course.resources || []).join("\n"),
    crossListedCourses: course.crossListedCourses || "",
    level: course.level || "",
    difficulty: String(course.difficulty ?? 0),
    popularity: String(course.popularity ?? 0),
    workload: String(course.workload ?? 0),
    isHidden: course.isHidden || false,
    isInternal: course.isInternal || false,
    detailsJson: JSON.stringify(course.details || {}, null, 2),
    instructorsText: (course.instructors || []).join(", "),
    topicsText: (course.fields || []).join(", "),
    semestersText: (course.semesters || []).join(", "),
    cauCategory: typeof course.details?.category === "string" ? course.details.category : "",
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>(course.fields || []);
  const [topicInput, setTopicInput] = useState("");

  const allTopicOptions = useMemo(
    () => Array.from(new Set([...(availableTopics || []), ...(course.fields || [])])).sort(),
    [availableTopics, course.fields],
  );

  const semestersPlaceholder = useMemo(() => {
    const seeds = Array.from(new Set([...(availableSemesters || []), ...(course.semesters || [])])).slice(0, 2);
    return seeds.length > 0 ? seeds.join(", ") : "Fall 2025, Spring 2026";
  }, [availableSemesters, course.semesters]);

  const syncTopics = (topics: string[]) => {
    const normalized = Array.from(new Set(topics.map((t) => t.trim()).filter((t) => t.length > 0)));
    setSelectedTopics(normalized);
    setFormData((p) => ({ ...p, topicsText: normalized.join(", ") }));
  };

  const addTopic = (topic: string) => {
    const value = topic.trim();
    if (!value) return;
    syncTopics([...selectedTopics, value]);
  };

  const removeTopic = (topic: string) => {
    syncTopics(selectedTopics.filter((t) => t !== topic));
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      removeTopic(topic);
    } else {
      addTopic(topic);
    }
  };

  const handleToggleEdit = () => {
    onEditingChange(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let parsedDetails: Record<string, unknown> = {};
      try {
        parsedDetails = formData.detailsJson.trim()
          ? (JSON.parse(formData.detailsJson) as Record<string, unknown>)
          : {};
      } catch {
        throw new Error("Invalid details JSON");
      }

      if (formData.cauCategory.trim()) {
        parsedDetails.category = formData.cauCategory.trim();
      } else {
        delete parsedDetails.category;
      }

      await updateCourseFull(course.id, {
        units: formData.units,
        credit: formData.credit.trim() ? Number(formData.credit) : null,
        description: formData.description,
        url: formData.url,
        department: formData.department,
        corequisites: formData.corequisites,
        prerequisites: formData.prerequisites,
        resources: formData.resourcesText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        crossListedCourses: formData.crossListedCourses,
        level: formData.level,
        difficulty: Number(formData.difficulty || 0),
        popularity: Number(formData.popularity || 0),
        workload: Number(formData.workload || 0),
        subdomain: course.subdomain || "",
        category: course.category || "",
        isHidden: formData.isHidden,
        isInternal: formData.isInternal,
        detailsJson: JSON.stringify(parsedDetails, null, 2),
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
        studyPlans,
        removedStudyPlanIds: [],
      });
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
      {showHeader && (
        <CourseDetailHeader
          course={course}
          isEditing={isEditing}
          onToggleEdit={handleToggleEdit}
          projectSeminarRef={projectSeminarRef}
        />
      )}

      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-base font-semibold text-[#1f1f1f]">About this Course</h2>
          {hasAiRegenerated ? (
            <span className="inline-flex h-8 items-center rounded-full border border-[#e1e1e1] bg-white px-2.5 text-[12px] font-medium text-[#666]">
              AI Regenerated
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRegenerateDescription}
              disabled={isSaving || isGeneratingDescription}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d3d3d3] bg-white text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              title="AI Regenerate Description"
            >
              {isGeneratingDescription ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        {!isEditing ? (
          <>
            {generatedDescription && (
              <div className="mb-3 rounded-md border border-[#e5e5e5] bg-white p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm font-medium text-[#2f2f2f]">AI Description Generated</p>
                  <p className="text-xs text-[#7a7a7a]">Review and apply to overwrite current description.</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleConfirmGeneratedDescription}
                    disabled={isApplyingGeneratedDescription}
                    size="sm"
                    className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
                  >
                    {isApplyingGeneratedDescription && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDiscardGeneratedDescription}
                    disabled={isApplyingGeneratedDescription}
                    size="sm"
                    className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}
            <div className="prose prose-sm prose-gray max-w-none prose-p:text-[#555] prose-p:leading-7">
              {(generatedDescription || description) ? (
                <FormattedDescription text={generatedDescription || description} />
              ) : (
                <p className="text-gray-500 italic">{descriptionEmptyText}</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={formData.url} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} className={`md:col-span-2 ${inputClass}`} placeholder="URL" />
              <input value={formData.units} onChange={(e) => setFormData((p) => ({ ...p, units: e.target.value }))} className={inputClass} placeholder="Units" />
              <input value={formData.credit} onChange={(e) => setFormData((p) => ({ ...p, credit: e.target.value }))} className={inputClass} placeholder="Credit" />
              <input value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} className={inputClass} placeholder="Department" />
              <input value={formData.level} onChange={(e) => setFormData((p) => ({ ...p, level: e.target.value }))} className={inputClass} placeholder="Level" />
              <select
                value={formData.cauCategory}
                onChange={(e) => setFormData((p) => ({ ...p, cauCategory: e.target.value }))}
                className={inputClass}
              >
                <option value="">Category (none)</option>
                {Array.from(
                  new Map(
                    [
                      ...CAU_CATEGORY_OPTIONS,
                      ...(formData.cauCategory
                        ? [{ value: formData.cauCategory, label: formData.cauCategory }]
                        : []),
                    ].map((option) => [option.value, option]),
                  ).values(),
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input value={formData.corequisites} onChange={(e) => setFormData((p) => ({ ...p, corequisites: e.target.value }))} className={`md:col-span-2 ${inputClass}`} placeholder="Corequisites" />
              <input value={formData.prerequisites} onChange={(e) => setFormData((p) => ({ ...p, prerequisites: e.target.value }))} className={`md:col-span-2 ${inputClass}`} placeholder="Prerequisites" />
              <input value={formData.crossListedCourses} onChange={(e) => setFormData((p) => ({ ...p, crossListedCourses: e.target.value }))} className={`md:col-span-2 ${inputClass}`} placeholder="Cross-listed courses" />
              <input value={formData.workload} onChange={(e) => setFormData((p) => ({ ...p, workload: e.target.value }))} className={inputClass} placeholder="Workload" />
              <input value={formData.difficulty} onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))} className={inputClass} placeholder="Difficulty" />
              <input value={formData.popularity} onChange={(e) => setFormData((p) => ({ ...p, popularity: e.target.value }))} className={inputClass} placeholder="Popularity" />
              <input value={formData.instructorsText} onChange={(e) => setFormData((p) => ({ ...p, instructorsText: e.target.value }))} className={`md:col-span-2 ${inputClass}`} placeholder="Instructors (comma-separated)" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#666]">Resources (one per line)</label>
              <textarea
                value={formData.resourcesText}
                onChange={(e) => setFormData((p) => ({ ...p, resourcesText: e.target.value }))}
                rows={4}
                className={textareaClass}
              />
            </div>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={10}
              className={textareaClass}
              placeholder="Description"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666]">Topics (course_fields)</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addTopic(topicInput);
                          setTopicInput("");
                        }
                      }}
                      className={inputClass}
                      placeholder="Type a topic and press Enter"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        addTopic(topicInput);
                        setTopicInput("");
                      }}
                      className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
                    >
                      Add
                    </Button>
                  </div>

                  {selectedTopics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTopics.map((topic) => (
                        <span key={topic} className="inline-flex items-center gap-1.5 bg-[#efefef] text-[#333] px-2 py-0.5 rounded-full text-xs font-medium border border-[#e1e1e1]">
                          {topic}
                          <button type="button" onClick={() => removeTopic(topic)} className="text-brand-blue/70 hover:text-brand-blue" title={`Remove ${topic}`}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {allTopicOptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allTopicOptions.map((topic) => {
                        const active = selectedTopics.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => toggleTopic(topic)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              active ? "bg-[#1f1f1f] text-white border-[#1f1f1f]" : "bg-white text-[#666] border-[#d8d8d8] hover:bg-[#f8f8f8]"
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666]">Semesters (course_semesters)</label>
                <input
                  value={formData.semestersText}
                  onChange={(e) => setFormData((p) => ({ ...p, semestersText: e.target.value }))}
                  className={inputClass}
                  placeholder={semestersPlaceholder}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-[#555]">
                <input
                  type="checkbox"
                  checked={formData.isInternal}
                  onChange={(e) => setFormData((p) => ({ ...p, isInternal: e.target.checked }))}
                />
                Internal
              </label>
              <label className="flex items-center gap-2 text-sm text-[#555]">
                <input
                  type="checkbox"
                  checked={formData.isHidden}
                  onChange={(e) => setFormData((p) => ({ ...p, isHidden: e.target.checked }))}
                />
                Hidden
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#666]">Details JSON (courses.details)</label>
              <textarea
                value={formData.detailsJson}
                onChange={(e) => setFormData((p) => ({ ...p, detailsJson: e.target.value }))}
                rows={12}
                className={textareaClass}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
              >
                {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save All
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleToggleEdit}
                disabled={isSaving}
                className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
