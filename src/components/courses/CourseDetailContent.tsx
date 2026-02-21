"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/types";
import CourseDetailTopSection, { EditableStudyPlan } from "@/components/courses/CourseDetailTopSection";
import { confirmGeneratedStudyPlans, previewStudyPlansFromCourseSchedule, type SchedulePlanPreview } from "@/actions/courses";
import { Check, Clock, ExternalLink, Globe, Info, Loader2, PenSquare, Trash2, Users, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUniversityUnitInfo } from "@/lib/university-units";

interface CourseDetailContentProps {
  course: Course;
  isEnrolled: boolean;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
  projectSeminarRef?: { id: number; category: string } | null;
}

export default function CourseDetailContent({
  course,
  isEnrolled,
  descriptionEmptyText,
  availableTopics,
  availableSemesters,
  studyPlans,
  projectSeminarRef = null,
}: CourseDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [isConfirmingPlans, setIsConfirmingPlans] = useState(false);
  const [editablePlans, setEditablePlans] = useState<EditableStudyPlan[]>(studyPlans);
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
  const [savingPlanIndex, setSavingPlanIndex] = useState<number | null>(null);
  const [deletingPlanIndex, setDeletingPlanIndex] = useState<number | null>(null);
  const [planPreview, setPlanPreview] = useState<{
    originalSchedule: Array<{ type: string; line: string }>;
    generatedPlans: SchedulePlanPreview[];
  } | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [statusCardMinHeight, setStatusCardMinHeight] = useState<number | null>(null);
  const router = useRouter();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hasStudyPlans = editablePlans.length > 0;
  const normalizeTime = (value: string) => (value.length === 5 ? `${value}:00` : value || "09:00:00");
  const unitInfo = useMemo(
    () => getUniversityUnitInfo(course.university, course.units),
    [course.university, course.units]
  );
  const estimatedWorkload = unitInfo.estimate?.details || "-";
  const categoryRaw = typeof course.details?.category === "string" ? course.details.category : "";
  const categoryLabel =
    categoryRaw === "Compulsory elective modules in Computer Science"
      ? "Compulsory elective"
      : categoryRaw === "Theoretical Computer Science"
        ? "Theoretical"
      : categoryRaw === "Advanced Project"
          ? "Project"
        : categoryRaw === "Seminar"
          ? "Seminar"
          : categoryRaw;
  const variantCodeLinks = useMemo(() => {
    const details = (course.details as Record<string, unknown> | undefined) || {};
    const raw = details.variant_code_links || details.cmu_code_links || details.mit_code_links || details.ucb_code_links || details.stanford_code_links;
    if (!Array.isArray(raw)) return [] as Array<{ id: string; link: string }>;
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = typeof (item as Record<string, unknown>).id === "string" ? (item as Record<string, unknown>).id : "";
        const link = typeof (item as Record<string, unknown>).link === "string" ? (item as Record<string, unknown>).link : "";
        if (!id) return null;
        return { id, link };
      })
      .filter((item): item is { id: string; link: string } => item !== null);
  }, [course.details]);
  const variantLabel = course.university?.toLowerCase() === "mit"
    ? "MIT Course Variants"
    : course.university?.toLowerCase() === "ucb"
      ? "UCB Course Variants"
      : course.university?.toLowerCase() === "stanford"
        ? "Stanford Course Variants"
      : "CMU Course Variants";

  useEffect(() => {
    const updateHeight = () => {
      const header = document.querySelector<HTMLElement>("[data-course-title-header]");
      if (!header) return;
      setStatusCardMinHeight(header.offsetHeight);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [course.title, course.university, course.courseCode]);

  const handleGeneratePlans = async () => {
    setIsGeneratingPlans(true);
    try {
      const preview = await previewStudyPlansFromCourseSchedule(course.id);
      const selectableIds = preview.generatedPlans.map((_, idx) => String(idx));
      setPlanPreview(preview);
      setSelectedPlanIds(selectableIds);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to generate study plans from schedule");
    } finally {
      setIsGeneratingPlans(false);
    }
  };

  const handleConfirmPlans = async () => {
    if (!planPreview) return;
    setIsConfirmingPlans(true);
    try {
      const selected = planPreview.generatedPlans
        .map((plan, idx) => ({ plan, idx: String(idx) }))
        .filter(({ idx }) => selectedPlanIds.includes(idx))
        .map(({ plan }) => ({
          daysOfWeek: plan.daysOfWeek,
          startTime: plan.startTime,
          endTime: plan.endTime,
          location: plan.location,
          type: plan.type,
          startDate: plan.startDate,
          endDate: plan.endDate,
        }));
      const result = await confirmGeneratedStudyPlans(course.id, selected, { replaceExisting: true });
      alert(`Updated Weekly Schedule with ${result.created} plan(s).`);
      setPlanPreview(null);
      setSelectedPlanIds([]);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save generated study plans");
    } finally {
      setIsConfirmingPlans(false);
    }
  };

  const handleDiscardPlans = () => {
    setPlanPreview(null);
    setSelectedPlanIds([]);
  };

  const handleDeleteSinglePlan = async (index: number) => {
    const plan = editablePlans[index];
    if (!plan) return;
    if (!plan.id) return;
    setDeletingPlanIndex(index);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_plan", planId: plan.id }),
      });
      if (!res.ok) throw new Error("Failed to delete study plan");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete study plan");
    } finally {
      setDeletingPlanIndex(null);
    }
  };

  const handleSaveSinglePlan = async (index: number) => {
    const plan = editablePlans[index];
    if (!plan) return;
    setSavingPlanIndex(index);
    try {
      if (plan.id) {
        const res = await fetch("/api/study-plans/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            courseId: course.id,
            startDate: plan.startDate,
            endDate: plan.endDate,
            daysOfWeek: plan.daysOfWeek,
            startTime: normalizeTime(plan.startTime),
            endTime: normalizeTime(plan.endTime),
            location: plan.location,
            type: plan.type,
          }),
        });
        if (!res.ok) throw new Error("Failed to update study plan");
      }
      setEditingPlanIndex(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save study plan");
    } finally {
      setSavingPlanIndex(null);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <CourseDetailTopSection
            course={course}
            descriptionEmptyText={descriptionEmptyText}
            availableTopics={availableTopics}
            availableSemesters={availableSemesters}
            studyPlans={studyPlans}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
            projectSeminarRef={projectSeminarRef}
          />

          {(hasStudyPlans || course.details?.schedule || (course.instructors && course.instructors.length > 0)) && (
            <section>
              <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h2 className="text-base font-semibold text-[#1f1f1f] mb-3">Logistics</h2>
              <div className="grid grid-cols-1 gap-4">
                {(hasStudyPlans || (course.details?.schedule && Object.keys(course.details.schedule).length > 0)) && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-medium text-[#333] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#777]" />
                        Weekly Schedule
                      </h3>
                      <button
                        type="button"
                        onClick={handleGeneratePlans}
                        disabled={isGeneratingPlans}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] disabled:opacity-50"
                        title="Generate study plan preview"
                      >
                        {isGeneratingPlans ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <WandSparkles className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className={hasStudyPlans ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "space-y-4"}>
                      {hasStudyPlans ? (
                        editablePlans.map((plan, idx) => (
                          <div key={plan.id ?? idx} className="rounded-md border border-[#e5e5e5] bg-white p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-medium text-[#777] mb-1">
                                {(plan.daysOfWeek || []).map((d) => dayLabels[d] || String(d)).join(", ") || "No days"}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingPlanIndex(idx)}
                                  className="h-7 w-7 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] inline-flex items-center justify-center"
                                  title="Edit plan"
                                >
                                  <PenSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSinglePlan(idx)}
                                  disabled={deletingPlanIndex === idx}
                                  className="h-7 w-7 rounded-md border border-[#efcaca] bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center justify-center"
                                  title="Delete plan"
                                >
                                  {deletingPlanIndex === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                            {editingPlanIndex === idx ? (
                              <div className="grid grid-cols-1 gap-2 mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="date"
                                    value={plan.startDate}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, startDate: e.target.value } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                  />
                                  <input
                                    type="date"
                                    value={plan.endDate}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, endDate: e.target.value } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                  />
                                  <input
                                    value={plan.daysOfWeek.join(",")}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, daysOfWeek: e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n)) } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                    placeholder="Days: 1,3,5"
                                  />
                                  <input
                                    value={plan.location}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, location: e.target.value } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                    placeholder="Location"
                                  />
                                  <input
                                    type="time"
                                    value={plan.startTime.slice(0, 5)}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, startTime: normalizeTime(e.target.value) } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                  />
                                  <input
                                    type="time"
                                    value={plan.endTime.slice(0, 5)}
                                    onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, endTime: normalizeTime(e.target.value) } : p))}
                                    className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                  />
                                </div>
                                <input
                                  value={plan.type || ""}
                                  onChange={(e) => setEditablePlans((prev) => prev.map((p, i) => i === idx ? { ...p, type: e.target.value } : p))}
                                  className="h-8 rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333]"
                                  placeholder="Type"
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSinglePlan(idx)}
                                    disabled={savingPlanIndex === idx}
                                    className="h-7 w-7 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] inline-flex items-center justify-center disabled:opacity-50"
                                    title="Save plan"
                                  >
                                    {savingPlanIndex === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPlanIndex(null)}
                                    className="h-7 w-7 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] inline-flex items-center justify-center"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <ul className="space-y-1">
                                <li className="text-sm text-[#444] leading-snug">
                                  {plan.startTime.slice(0, 5)}-{plan.endTime.slice(0, 5)}
                                </li>
                                <li className="text-xs text-[#666] flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-full border border-[#e1e1e1] bg-[#f3f3f3] px-2 py-0.5 text-[11px] font-medium text-[#444]">
                                    {plan.type || "Session"}
                                  </span>
                                  <span>@ {plan.location || "TBD"}</span>
                                </li>
                                <li className="text-xs text-[#888]">
                                  {new Date(plan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  {" - "}
                                  {new Date(plan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </li>
                              </ul>
                            )}
                          </div>
                        ))
                      ) : (
                        Object.entries(course.details?.schedule || {}).map(([type, times]) => (
                          <div key={type}>
                            <div className="text-xs font-medium text-[#777] mb-1">{type}</div>
                            <ul className="space-y-2">
                              {(times as string[]).map((time, idx) => (
                                <li key={idx} className="text-sm text-[#444] leading-snug break-all">
                                  {time}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {course.instructors && course.instructors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#777]" />
                      Teaching Staff
                    </h3>
                    <ul className="space-y-3">
                      {course.instructors.map((inst, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center text-[#666] text-xs font-medium">
                            {inst.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-[#222]">{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {planPreview && (
                <div className="mt-4 rounded-lg border border-[#d9d9d9] bg-white p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#1f1f1f]">Study Plan Preview</h3>
                    <p className="text-xs text-[#777]">Select plans to save into your roadmap</p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-md border border-[#e5e5e5] bg-[#fcfcfc] p-3">
                      <p className="text-xs font-medium text-[#666] mb-2">Original Schedule</p>
                      <ul className="space-y-1.5 text-sm text-[#444]">
                        {planPreview.originalSchedule.map((item, idx) => (
                          <li key={`${item.type}-${idx}`}>
                            <span className="font-medium">{item.type}:</span> {item.line}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-md border border-[#e5e5e5] bg-[#fcfcfc] p-3">
                      <p className="text-xs font-medium text-[#666] mb-2">AI Generated Plans</p>
                      <ul className="space-y-2">
                        {planPreview.generatedPlans.map((plan, idx) => {
                          const id = String(idx);
                          const disabled = false;
                          const daysText = plan.daysOfWeek.map((d) => dayLabels[d] || String(d)).join(", ");
                          return (
                            <li key={id} className="rounded-md border border-[#e5e5e5] bg-white px-2.5 py-2">
                              <label className="flex items-start gap-2 text-sm text-[#444]">
                                <input
                                  type="checkbox"
                                  checked={selectedPlanIds.includes(id)}
                                  disabled={disabled || isConfirmingPlans}
                                  onChange={(e) => {
                                    setSelectedPlanIds((prev) =>
                                      e.target.checked ? [...prev, id] : prev.filter((v) => v !== id),
                                    );
                                  }}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0">
                                  <span className="block font-medium">
                                    {daysText} • {plan.startTime.slice(0, 5)}-{plan.endTime.slice(0, 5)}
                                  </span>
                                  <span className="block text-xs text-[#666]">
                                    <span className="inline-flex items-center rounded-full border border-[#e1e1e1] bg-[#f3f3f3] px-2 py-0.5 text-[11px] font-medium text-[#444] mr-1.5">
                                      {plan.type || "Session"}
                                    </span>
                                    @ {plan.location}
                                    {plan.alreadyExists ? " (will replace existing)" : ""}
                                  </span>
                                  {plan.startDate && plan.endDate && (
                                    <span className="block text-xs text-[#888]">
                                      {new Date(plan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                      {" - "}
                                      {new Date(plan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleConfirmPlans}
                      disabled={isConfirmingPlans || selectedPlanIds.length === 0}
                      size="sm"
                      className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
                    >
                      {isConfirmingPlans ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDiscardPlans}
                      disabled={isConfirmingPlans}
                      size="sm"
                      className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8]"
                    >
                      <X className="w-3 h-3" />
                      Discard
                    </Button>
                  </div>
                </div>
              )}
              </div>
            </section>
          )}

          {(course.prerequisites || course.corequisites) && (
            <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h2 className="text-base font-semibold text-[#1f1f1f] mb-3">Prerequisites</h2>
              <div className="space-y-8">
                {course.prerequisites && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">Required Knowledge</span>
                    <p className="text-sm text-[#444] leading-relaxed">{course.prerequisites}</p>
                  </div>
                )}
                {course.corequisites && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">Corequisites</span>
                    <p className="text-sm text-[#444] leading-relaxed">{course.corequisites}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="sticky top-0 space-y-4">
              <div
                className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 flex flex-col justify-between"
                style={statusCardMinHeight ? { minHeight: `${statusCardMinHeight}px` } : undefined}
              >
                <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#666]">Your Status</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isEnrolled ? "bg-green-50 text-green-700 border-green-100" : "bg-[#f3f3f3] text-[#666] border-[#e5e5e5]"}`}>
                    {isEnrolled ? "Enrolled" : "Not Enrolled"}
                  </span>
                </div>
                </div>
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center w-full gap-2 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
                >
                  <span>Visit Course Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#777]" />
                </a>
              </div>

              <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
                <h3 className="text-sm font-semibold text-[#1f1f1f] mb-4">Course Facts</h3>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666]">Credits</dt>
                    <dd className="font-medium text-[#222]">{course.credit ? `${course.credit} ECTS` : "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1 overflow-visible relative">
                    <dt className="text-[#666] flex-shrink-0 flex items-center gap-1.5 group cursor-help relative">
                      {unitInfo.label}
                      <Info className="w-3.5 h-3.5 text-[#999]" />
                      <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-md border border-[#dcdcdc] bg-white px-2 py-1.5 text-[11px] font-normal leading-relaxed text-[#555] shadow-sm group-hover:block">
                        {unitInfo.help}
                      </span>
                    </dt>
                    <dd className="font-medium text-[#222] text-right pl-4 break-words">{course.units || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666] flex-shrink-0">Workload</dt>
                    <dd className="font-medium text-[#222] text-right pl-4 break-words">{estimatedWorkload}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666] flex-shrink-0">Level</dt>
                    <dd className="font-medium text-[#222] capitalize text-right pl-4 break-words">{course.level || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666] flex-shrink-0">Department</dt>
                    <dd className="font-medium text-[#222] text-right pl-4 break-words">{course.department || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666] flex-shrink-0">Category</dt>
                    <dd className="font-medium text-[#222] text-right pl-4 break-words">{categoryLabel || "-"}</dd>
                  </div>
                  <div className="flex flex-col py-1 gap-2">
                    <dt className="text-[#666]">Available Terms</dt>
                    <dd className="font-medium text-[#222] flex flex-wrap gap-1.5 justify-end">
                      {course.semesters.length > 0 ? (
                        course.semesters.map((s, idx) => (
                          <span key={idx} className="bg-white px-2 py-0.5 rounded border border-[#e5e5e5] text-[11px] whitespace-nowrap">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#999] font-normal italic">Historical</span>
                      )}
                    </dd>
                  </div>
                  {course.details?.internalId && (
                    <div className="flex justify-between py-1">
                      <dt className="text-[#666]">ID</dt>
                      <dd className="font-mono text-[#999]">{course.details.internalId}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {(course.crossListedCourses || (course.relatedUrls && course.relatedUrls.length > 0) || variantCodeLinks.length > 0) && (
                <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
                  <h3 className="text-sm font-semibold text-[#1f1f1f] mb-4">Resources</h3>
                  <div className="space-y-4">
                    {course.relatedUrls && course.relatedUrls.length > 0 && (
                      <ul className="space-y-3">
                        {course.relatedUrls.map((url: string, i: number) => (
                          <li key={i}>
                            <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#335b9a] hover:underline flex items-start gap-2 break-all">
                              <Globe className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#778fb8]" />
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {course.crossListedCourses && (
                      <div>
                        <span className="text-xs font-medium text-[#777] block mb-2">Cross-Listed</span>
                        <p className="text-sm text-[#555] leading-relaxed">{course.crossListedCourses}</p>
                      </div>
                    )}
                    {variantCodeLinks.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[#777] block mb-2">{variantLabel}</span>
                        <ul className="space-y-2">
                          {variantCodeLinks.map((item) => (
                            <li key={item.id} className="text-sm text-[#555]">
                              {item.link ? (
                                <a href={item.link} target="_blank" rel="noreferrer" className="text-[#335b9a] hover:underline">
                                  {item.id}
                                </a>
                              ) : (
                                <span>{item.id}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}
