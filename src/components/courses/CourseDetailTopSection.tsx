"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/types";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import FormattedDescription from "@/components/courses/FormattedDescription";
import { regenerateCourseDescription, updateCourseDescription, updateCourseFull } from "@/actions/courses";
import { Loader2, Sparkles, X } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList
} from "@/components/ui/combobox";

export interface EditableStudyPlan {
  id?: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  kind: string;
  timezone?: string;
}

const EMPTY_CATEGORY_VALUE = "__none__";

interface CourseDetailTopSectionProps {
  course: Course;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  projectSeminarRef?: {id: number;category: string;} | null;
  showHeader?: boolean;
}

const AI_DESCRIPTION_MARK = "AI Regenerated";
const CAU_CATEGORY_OPTIONS = [
{ value: "Theoretical Computer Science", label: "Theoretical" },
{ value: "Compulsory elective modules in Computer Science", label: "Compulsory elective" },
{ value: "Advanced Project", label: "Project" },
{ value: "Seminar", label: "Seminar" }];


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
  showHeader = true
}: CourseDetailTopSectionProps) {
  const textareaClass =
  "w-full border border-[#d8d8d8] bg-white p-3 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";
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
    instructorsText: (course.instructors || []).join(", "),
    topicsText: (course.fields || []).join(", "),
    semestersText: (course.semesters || []).join(", "),
    cauCategory: typeof course.details?.category === "string" ? course.details.category : ""
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>(course.fields || []);

  const allTopicOptions = useMemo(
    () => Array.from(new Set([...(availableTopics || []), ...(course.fields || [])])).sort(),
    [availableTopics, course.fields]
  );
  const availableTopicOptions = useMemo(
    () => allTopicOptions.filter((topic) => !selectedTopics.includes(topic)),
    [allTopicOptions, selectedTopics]
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

  const handleToggleEdit = () => {
    onEditingChange(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedDetails: Record<string, unknown> = {
        ...((course.details as Record<string, unknown> | undefined) || {})
      };

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
        resources: formData.resourcesText.
        split("\n").
        map((s) => s.trim()).
        filter((s) => s.length > 0),
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
        instructors: formData.instructorsText.
        split(",").
        map((s) => s.trim()).
        filter((s) => s.length > 0),
        topics: formData.topicsText.
        split(",").
        map((s) => s.trim()).
        filter((s) => s.length > 0),
        semesters: formData.semestersText.
        split(",").
        map((s) => s.trim()).
        filter((s) => s.length > 0),
        studyPlans,
        removedStudyPlanIds: []
      });
      onEditingChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update course details", { position: "bottom-right" });
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
      toast.error(error instanceof Error ? error.message : "Failed to regenerate description", { position: "bottom-right" });
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
      toast.error("Failed to update course description", { position: "bottom-right" });
    } finally {
      setIsApplyingGeneratedDescription(false);
    }
  };

  const handleDiscardGeneratedDescription = () => {
    setGeneratedDescription(null);
  };

  return (
    <div>
      {showHeader &&
      <CourseDetailHeader
        course={course}
        isEditing={isEditing}
        onToggleEdit={handleToggleEdit}
        projectSeminarRef={projectSeminarRef} />

      }

      <div>
        {!isEditing ? (
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-base font-semibold text-[#1f1f1f]">About this Course</h2>
          {hasAiRegenerated ?
          <span className="inline-flex h-8 items-center border border-[#e1e1e1] bg-white px-2.5 text-[12px] font-medium text-[#666]">
              AI Regenerated
            </span> :

          <Button variant="outline"
          type="button"
          onClick={handleRegenerateDescription}
          disabled={isSaving || isGeneratingDescription}

          title="AI Regenerate Description">
            
              {isGeneratingDescription ?
            <Loader2 className="animate-spin" /> :

            <Sparkles />
            }
            </Button>
          }
        </div>
        ) : null}
        {!isEditing ?
        <>
            {generatedDescription &&
          <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm font-medium text-[#2f2f2f]">AI Description Generated</p>
                  <p className="text-xs text-[#7a7a7a]">Review and apply to overwrite current description.</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline"
              type="button"
              onClick={handleConfirmGeneratedDescription}
              disabled={isApplyingGeneratedDescription}
              size="sm">

                
                    {isApplyingGeneratedDescription && <Loader2 className="animate-spin" />}
                    Confirm
                  </Button>
                  <Button
                type="button"
                variant="ghost"
                onClick={handleDiscardGeneratedDescription}
                disabled={isApplyingGeneratedDescription}
                size="sm">

                
                    Discard
                  </Button>
                </div>
              </Card>
          }
            <div className="prose prose-sm prose-gray max-w-none prose-p:text-[#555] prose-p:leading-7">
              {generatedDescription || description ?
            <FormattedDescription text={generatedDescription || description} /> :

            <p className="text-gray-500 italic">{descriptionEmptyText}</p>
            }
            </div>
          </> :

        <Card>
          <CardHeader>
            <CardTitle>Edit Course Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">URL</label>
                <Input value={formData.url} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} placeholder="URL" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Units</label>
                <Input value={formData.units} onChange={(e) => setFormData((p) => ({ ...p, units: e.target.value }))} placeholder="Units" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Credit</label>
                <Input value={formData.credit} onChange={(e) => setFormData((p) => ({ ...p, credit: e.target.value }))} placeholder="Credit" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Department</label>
                <Input value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} placeholder="Department" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Level</label>
                <Input value={formData.level} onChange={(e) => setFormData((p) => ({ ...p, level: e.target.value }))} placeholder="Level" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Category</label>
                <Select
                value={formData.cauCategory || EMPTY_CATEGORY_VALUE}
                onValueChange={(next) =>
                setFormData((p) => ({
                  ...p,
                  cauCategory: next === EMPTY_CATEGORY_VALUE ? "" : next
                }))
                }>
                  
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Categories</SelectLabel>
                      <SelectItem value={EMPTY_CATEGORY_VALUE}>Category (none)</SelectItem>
                      {Array.from(
                      new Map(
                        [
                        ...CAU_CATEGORY_OPTIONS,
                        ...(formData.cauCategory ?
                        [{ value: formData.cauCategory, label: formData.cauCategory }] :
                        [])].
                        map((option) => [option.value, option])
                      ).values()
                    ).map((option) =>
                    <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                    )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Corequisites</label>
                <Input value={formData.corequisites} onChange={(e) => setFormData((p) => ({ ...p, corequisites: e.target.value }))} placeholder="Corequisites" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Prerequisites</label>
                <Input value={formData.prerequisites} onChange={(e) => setFormData((p) => ({ ...p, prerequisites: e.target.value }))} placeholder="Prerequisites" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Cross-listed Courses</label>
                <Input value={formData.crossListedCourses} onChange={(e) => setFormData((p) => ({ ...p, crossListedCourses: e.target.value }))} placeholder="Cross-listed courses" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Workload</label>
                <Input value={formData.workload} onChange={(e) => setFormData((p) => ({ ...p, workload: e.target.value }))} placeholder="Workload" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Difficulty</label>
                <Input value={formData.difficulty} onChange={(e) => setFormData((p) => ({ ...p, difficulty: e.target.value }))} placeholder="Difficulty" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Popularity</label>
                <Input value={formData.popularity} onChange={(e) => setFormData((p) => ({ ...p, popularity: e.target.value }))} placeholder="Popularity" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Instructors</label>
                <Input value={formData.instructorsText} onChange={(e) => setFormData((p) => ({ ...p, instructorsText: e.target.value }))} placeholder="Instructors (comma-separated)" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#666]">Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <Toggle
                    pressed={formData.isInternal}
                    onPressedChange={(pressed) =>
                      setFormData((p) => ({ ...p, isInternal: pressed }))
                    }
                    size="sm"
                    variant="outline"
                    className="w-full justify-center data-[state=on]:bg-black data-[state=on]:text-white data-[state=on]:border-black"
                    aria-label="Toggle internal"
                    title="Internal"
                  >
                    Internal
                  </Toggle>
                  <Toggle
                    pressed={formData.isHidden}
                    onPressedChange={(pressed) =>
                      setFormData((p) => ({ ...p, isHidden: pressed }))
                    }
                    size="sm"
                    variant="outline"
                    className="w-full justify-center data-[state=on]:bg-black data-[state=on]:text-white data-[state=on]:border-black"
                    aria-label="Toggle hidden"
                    title="Hidden"
                  >
                    Hidden
                  </Toggle>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#666]">Resources (one per line)</label>
              <Textarea
              value={formData.resourcesText}
              onChange={(e) => setFormData((p) => ({ ...p, resourcesText: e.target.value }))}
              rows={4}
              className={textareaClass} />
            
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#666]">Description</label>
              <Textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={10}
              className={textareaClass}
              placeholder="Description" />
            </div>
          

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666]">Topics</label>
                <div className="space-y-2">
                  <Combobox
                    items={[{ value: "Topics", items: availableTopicOptions }]}
                    onValueChange={(next) => {
                      if (next) addTopic(String(next));
                    }}
                  >
                    <ComboboxInput placeholder="Search topics and select" />
                    <ComboboxContent>
                      <ComboboxEmpty>No topics found.</ComboboxEmpty>
                      <ComboboxList>
                        {(group) => (
                          <ComboboxGroup key={group.value} items={group.items}>
                            <ComboboxLabel>{group.value}</ComboboxLabel>
                            <ComboboxCollection>
                              {(item) => (
                                <ComboboxItem key={item} value={item}>
                                  {item}
                                </ComboboxItem>
                              )}
                            </ComboboxCollection>
                          </ComboboxGroup>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>

                  {selectedTopics.length > 0 &&
                <div className="flex flex-wrap gap-2">
                      {selectedTopics.map((topic) =>
                  <Badge key={topic} variant="outline" className="inline-flex items-center gap-1.5">
                          {topic}
                          <button type="button" onClick={() => removeTopic(topic)} title={`Remove ${topic}`} aria-label={`Remove ${topic}`} className="inline-flex items-center text-current/70 hover:text-current">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                  )}
                    </div>
                }
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666]">Semesters</label>
                <Input
                value={formData.semestersText}
                onChange={(e) => setFormData((p) => ({ ...p, semestersText: e.target.value }))}
                placeholder={semestersPlaceholder} />
              
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="outline"
            type="button"
            onClick={handleSave}
            disabled={isSaving}>

              
                {isSaving && <Loader2 className="animate-spin" />}
                Save All
              </Button>
              <Button
              type="button"
              variant="outline"
              onClick={handleToggleEdit}
              disabled={isSaving}>

              
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
        }
      </div>
    </div>);

}
