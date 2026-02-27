"use client";

import { ExternalLink } from "lucide-react";

// ---- types ----------------------------------------------------------------

interface MaterialItem {
  label: string;
  url?: string | null;
}

interface TaskItem {
  label: string;
  due_date?: string | null;
}

export interface SyllabusEntry {
  sequence?: string;
  title?: string | null;
  date?: string | null;
  date_end?: string | null;
  instructor?: string | null;
  topics?: string[];
  description?: string | null;
  slides?: MaterialItem[];
  videos?: MaterialItem[];
  readings?: MaterialItem[];
  modules?: MaterialItem[];
  assignments?: TaskItem[];
  labs?: TaskItem[];
  exams?: TaskItem[];
  projects?: TaskItem[];
}

export interface SyllabusContent {
  objectives?: string[];
  grading?: { component: string; weight: number }[];
  textbooks?: string[];
  policies?: string;
}

interface CourseSyllabusTableProps {
  schedule: SyllabusEntry[];
  content: SyllabusContent;
  sourceUrl?: string | null;
}

// ---- helpers ---------------------------------------------------------------

function MaterialLink({ item }: { item: MaterialItem }) {
  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[#335b9a] hover:underline text-xs"
      >
        {item.label}
        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
      </a>
    );
  }
  return <span className="text-xs text-[#555]">{item.label}</span>;
}

function TaskBadge({ item }: { item: TaskItem }) {
  return (
    <span className="inline-flex flex-col text-xs">
      <span className="font-medium text-[#333]">{item.label}</span>
      {item.due_date && (
        <span className="text-[#888] text-[11px]">due {item.due_date}</span>
      )}
    </span>
  );
}

// ---- main component --------------------------------------------------------

export default function CourseSyllabusTable({
  schedule,
  content,
  sourceUrl,
}: CourseSyllabusTableProps) {
  const hasMaterials = schedule.some(
    (e) =>
      (e.slides?.length ?? 0) > 0 ||
      (e.videos?.length ?? 0) > 0 ||
      (e.readings?.length ?? 0) > 0 ||
      (e.modules?.length ?? 0) > 0
  );
  const hasTasks = schedule.some(
    (e) =>
      (e.assignments?.length ?? 0) > 0 ||
      (e.labs?.length ?? 0) > 0 ||
      (e.exams?.length ?? 0) > 0 ||
      (e.projects?.length ?? 0) > 0
  );
  const hasInstructor = schedule.some((e) => !!e.instructor);
  const hasDescription = schedule.some((e) => !!e.description);

  return (
    <div className="space-y-4">
      {sourceUrl && (
        <div className="flex items-center gap-1.5 text-xs text-[#666]">
          <span>Source:</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#335b9a] hover:underline inline-flex items-center gap-1"
          >
            {sourceUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {schedule.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#f7f7f7] border-b border-[#e5e5e5]">
                <th className="text-left px-3 py-2 text-xs font-semibold text-[#555] whitespace-nowrap">#</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-[#555] whitespace-nowrap">Date</th>
                {hasInstructor && (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-[#555] whitespace-nowrap">Instructor</th>
                )}
                <th className="text-left px-3 py-2 text-xs font-semibold text-[#555]">Topics</th>
                {hasDescription && (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-[#555]">Description</th>
                )}
                {hasMaterials && (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-[#555]">Materials</th>
                )}
                {hasTasks && (
                  <th className="text-left px-3 py-2 text-xs font-semibold text-[#555]">Tasks</th>
                )}
              </tr>
            </thead>
            <tbody>
              {schedule.map((entry, idx) => {
                const allMaterials = [
                  ...(entry.slides || []).map((m) => ({ ...m, kind: "Slides" })),
                  ...(entry.videos || []).map((m) => ({ ...m, kind: "Video" })),
                  ...(entry.readings || []).map((m) => ({ ...m, kind: "Reading" })),
                  ...(entry.modules || []).map((m) => ({ ...m, kind: "Module" })),
                ];
                const allTasks = [
                  ...(entry.assignments || []).map((t) => ({ ...t, kind: "Assignment" })),
                  ...(entry.labs || []).map((t) => ({ ...t, kind: "Lab" })),
                  ...(entry.exams || []).map((t) => ({ ...t, kind: "Exam" })),
                  ...(entry.projects || []).map((t) => ({ ...t, kind: "Project" })),
                ];

                return (
                  <tr
                    key={idx}
                    className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition-colors"
                  >
                    <td className="px-3 py-2.5 align-top">
                      <span className="text-xs font-medium text-[#888] whitespace-nowrap">
                        {entry.sequence ?? idx + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                      {entry.date ? (
                        <span className="text-xs text-[#555]">
                          {entry.date}
                          {entry.date_end && ` – ${entry.date_end}`}
                        </span>
                      ) : (
                        <span className="text-xs text-[#ccc]">—</span>
                      )}
                    </td>
                    {hasInstructor && (
                      <td className="px-3 py-2.5 align-top whitespace-nowrap">
                        <span className="text-xs text-[#555]">{entry.instructor ?? ""}</span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 align-top">
                      {entry.title && (
                        <p className="text-xs font-semibold text-[#1f1f1f] mb-1 leading-snug">{entry.title}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(entry.topics || []).map((t, i) => (
                          <span
                            key={i}
                            className="inline-block rounded border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-[11px] text-[#444]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    {hasDescription && (
                      <td className="px-3 py-2.5 align-top max-w-[200px]">
                        <span className="text-xs text-[#666] leading-relaxed">{entry.description ?? ""}</span>
                      </td>
                    )}
                    {hasMaterials && (
                      <td className="px-3 py-2.5 align-top">
                        <div className="space-y-1">
                          {allMaterials.map((m, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="text-[10px] font-medium text-[#aaa] w-12 shrink-0">{m.kind}</span>
                              <MaterialLink item={m} />
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                    {hasTasks && (
                      <td className="px-3 py-2.5 align-top">
                        <div className="space-y-1.5">
                          {allTasks.map((t, i) => (
                            <div key={i} className="flex items-start gap-1">
                              <span className="text-[10px] font-medium text-[#aaa] w-16 shrink-0 pt-0.5">{t.kind}</span>
                              <TaskBadge item={t} />
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(content.grading?.length || content.objectives?.length || content.textbooks?.length || content.policies) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.grading && content.grading.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Grading</h3>
              <ul className="space-y-1.5">
                {content.grading.map((g, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#555]">{g.component}</span>
                    <span className="font-medium text-[#222]">{g.weight}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {content.objectives && content.objectives.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Objectives</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                {content.objectives.map((o, i) => (
                  <li key={i} className="text-sm text-[#555] leading-relaxed">{o}</li>
                ))}
              </ul>
            </div>
          )}
          {content.textbooks && content.textbooks.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Textbooks</h3>
              <ul className="space-y-1.5">
                {content.textbooks.map((t, i) => (
                  <li key={i} className="text-sm text-[#555]">{t}</li>
                ))}
              </ul>
            </div>
          )}
          {content.policies && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Policies</h3>
              <p className="text-sm text-[#555] leading-relaxed">{content.policies}</p>
            </div>
          )}
        </div>
      )}

      {schedule.length === 0 && (
        <p className="text-sm text-[#888]">No schedule entries found in syllabus.</p>
      )}
    </div>
  );
}
