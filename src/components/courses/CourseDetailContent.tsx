"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/types";
import CourseDetailTopSection, { EditableStudyPlan } from "@/components/courses/CourseDetailTopSection";
import { confirmGeneratedStudyPlans, previewStudyPlansFromCourseSchedule, type SchedulePlanPreview } from "@/actions/courses";
import { Check, Clock, ExternalLink, Globe, Info, Loader2, Users, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseDetailContentProps {
  course: Course;
  isEnrolled: boolean;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
}

export default function CourseDetailContent({
  course,
  isEnrolled,
  descriptionEmptyText,
  availableTopics,
  availableSemesters,
  studyPlans,
}: CourseDetailContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [isConfirmingPlans, setIsConfirmingPlans] = useState(false);
  const [planPreview, setPlanPreview] = useState<{
    originalSchedule: Array<{ type: string; line: string }>;
    generatedPlans: SchedulePlanPreview[];
  } | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const router = useRouter();

  const handleGeneratePlans = async () => {
    setIsGeneratingPlans(true);
    try {
      const preview = await previewStudyPlansFromCourseSchedule(course.id);
      const selectableIds = preview.generatedPlans
        .map((_, idx) => String(idx))
        .filter((idx) => !preview.generatedPlans[Number(idx)].alreadyExists);
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
        .filter(({ idx, plan }) => selectedPlanIds.includes(idx) && !plan.alreadyExists)
        .map(({ plan }) => ({
          daysOfWeek: plan.daysOfWeek,
          startTime: plan.startTime,
          endTime: plan.endTime,
          location: plan.location,
          type: plan.type,
          startDate: plan.startDate,
          endDate: plan.endDate,
        }));
      const result = await confirmGeneratedStudyPlans(course.id, selected);
      alert(`Created ${result.created} study plan(s).`);
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

  return (
    <div className="space-y-16 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        <div className="lg:col-span-8 space-y-16">
          <CourseDetailTopSection
            course={course}
            descriptionEmptyText={descriptionEmptyText}
            availableTopics={availableTopics}
            availableSemesters={availableSemesters}
            studyPlans={studyPlans}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
          />

          {(course.details?.schedule || (course.instructors && course.instructors.length > 0)) && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100">Logistics</h2>
              <div className="grid sm:grid-cols-2 gap-12">
                {course.details?.schedule && Object.keys(course.details.schedule).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        Weekly Schedule
                      </h3>
                      <button
                        type="button"
                        onClick={handleGeneratePlans}
                        disabled={isGeneratingPlans}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        title="Generate study plan preview"
                      >
                        {isGeneratingPlans ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <WandSparkles className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="space-y-6">
                      {Object.entries(course.details.schedule).map(([type, times]) => (
                        <div key={type}>
                          <div className="text-xs font-bold text-gray-400 mb-1">{type}</div>
                          <ul className="space-y-2">
                            {(times as string[]).map((time, idx) => (
                              <li key={idx} className="text-sm text-gray-700 leading-snug break-all">
                                {time}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {planPreview && (
                      <div className="mt-6 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 space-y-4">
                        <p className="text-sm font-medium text-brand-blue">Study Plan Preview</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500">Original Schedule</p>
                            <ul className="space-y-1 text-sm text-gray-700">
                              {planPreview.originalSchedule.map((item, idx) => (
                                <li key={`${item.type}-${idx}`}>
                                  <span className="font-semibold">{item.type}:</span> {item.line}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-500">AI Generated Plans</p>
                            <ul className="space-y-2">
                              {planPreview.generatedPlans.map((plan, idx) => {
                                const id = String(idx);
                                const disabled = plan.alreadyExists;
                                return (
                                  <li key={id} className="flex items-start gap-2 text-sm text-gray-700">
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
                                    <div>
                                      <div>
                                        {plan.daysOfWeek.join(",")} • {plan.startTime.slice(0, 5)}-{plan.endTime.slice(0, 5)}
                                        {plan.startDate && plan.endDate && (
                                          <span className="text-xs text-gray-400 ml-2">
                                            ({new Date(plan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}-{new Date(plan.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {plan.type} @ {plan.location}
                                        {disabled ? " (already exists)" : ""}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            onClick={handleConfirmPlans}
                            disabled={isConfirmingPlans || selectedPlanIds.length === 0}
                            size="sm"
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
                          >
                            <X className="w-3 h-3" />
                            Discard
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {course.instructors && course.instructors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      Teaching Staff
                    </h3>
                    <ul className="space-y-3">
                      {course.instructors.map((inst, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold font-mono">
                            {inst.charAt(0)}
                          </div>
                          <span className="text-base font-medium text-gray-900">{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {(course.prerequisites || course.corequisites) && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Prerequisites</h2>
              <div className="space-y-8">
                {course.prerequisites && (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Required Knowledge</span>
                    <p className="text-base text-gray-700 leading-relaxed">{course.prerequisites}</p>
                  </div>
                )}
                {course.corequisites && (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-2">Corequisites</span>
                    <p className="text-base text-gray-700 leading-relaxed">{course.corequisites}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-10">
          <div className="sticky top-32 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Your Status</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${isEnrolled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {isEnrolled ? "Enrolled" : "Not Enrolled"}
                  </span>
                </div>
                <a
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl transition-colors group"
                >
                  <span className="text-sm">Visit Course Page</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </a>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6">Course Facts</h3>
                <dl className="space-y-4 text-sm">
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500">Credits</dt>
                    <dd className="font-bold text-gray-900">{course.credit ? `${course.credit} ECTS` : "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1 overflow-visible relative">
                    <dt className="text-gray-500 flex-shrink-0 flex items-center gap-1.5 group cursor-help">
                      Units (L-D-E)
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </dt>
                    <dd className="font-bold text-gray-900 text-right pl-4 break-words">{course.units || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500 flex-shrink-0">Workload</dt>
                    <dd className="font-bold text-gray-900 text-right pl-4 break-words">{course.units || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500 flex-shrink-0">Level</dt>
                    <dd className="font-bold text-gray-900 capitalize text-right pl-4 break-words">{course.level || "-"}</dd>
                  </div>
                  <div className="flex justify-between py-1">
                    <dt className="text-gray-500 flex-shrink-0">Department</dt>
                    <dd className="font-bold text-gray-900 text-right pl-4 break-words">{course.department || "-"}</dd>
                  </div>
                  <div className="flex flex-col py-1 gap-2">
                    <dt className="text-gray-500">Available Terms</dt>
                    <dd className="font-bold text-gray-900 flex flex-wrap gap-1.5 justify-end">
                      {course.semesters.length > 0 ? (
                        course.semesters.map((s, idx) => (
                          <span key={idx} className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-[11px] whitespace-nowrap">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 font-normal italic">Historical</span>
                      )}
                    </dd>
                  </div>
                  {course.details?.internalId && (
                    <div className="flex justify-between py-1">
                      <dt className="text-gray-500">ID</dt>
                      <dd className="font-mono text-gray-400">{course.details.internalId}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <hr className="border-gray-100" />

              {(course.crossListedCourses || (course.relatedUrls && course.relatedUrls.length > 0)) && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-6">Resources</h3>
                  <div className="space-y-6">
                    {course.relatedUrls && course.relatedUrls.length > 0 && (
                      <ul className="space-y-3">
                        {course.relatedUrls.map((url: string, i: number) => (
                          <li key={i}>
                            <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-blue hover:text-brand-dark hover:underline flex items-start gap-2 break-all">
                              <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {course.crossListedCourses && (
                      <div>
                        <span className="text-xs font-bold text-gray-400 block mb-2">Cross-Listed</span>
                        <p className="text-sm text-gray-600 leading-relaxed">{course.crossListedCourses}</p>
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
