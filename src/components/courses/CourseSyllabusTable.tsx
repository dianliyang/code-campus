"use client";

import { useState } from "react";
import { ExternalLink, Minus } from "lucide-react";

// ---- types ----------------------------------------------------------------

interface MaterialItem {
  label: string;
  url?: string | null;
}

interface TaskItem {
  label: string;
  due_date?: string | null;
  url?: string | null;
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
  textbooks?: Array<string | { title?: string; url?: string | null; authors?: string[]; required?: boolean }>;
  policies?: string | Record<string, unknown>;
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
  const titleNode = item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[#335b9a] hover:underline"
    >
      {item.label}
      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
    </a>
  ) : (
    <span className="font-medium text-[#333]">{item.label}</span>
  );
  return (
    <span className="inline-flex flex-col text-xs">
      {titleNode}
      {item.due_date && (
        <span className="text-[#888] text-[11px]">due {item.due_date}</span>
      )}
    </span>
  );
}

type TextbookValue = NonNullable<SyllabusContent["textbooks"]>[number];

function normalizeTextbook(tb: TextbookValue): {
  title: string;
  url: string | null;
  authors: string[];
  required: boolean | null;
} {
  if (typeof tb === "string") {
    return { title: tb, url: null, authors: [], required: null };
  }
  const title = typeof tb.title === "string" && tb.title.trim() ? tb.title.trim() : "Untitled textbook";
  const url = typeof tb.url === "string" && tb.url.trim() ? tb.url.trim() : null;
  const authors = Array.isArray(tb.authors) ? tb.authors.filter((a): a is string => typeof a === "string" && a.trim().length > 0) : [];
  const required = typeof tb.required === "boolean" ? tb.required : null;
  return { title, url, authors, required };
}

function renderPolicies(policies: SyllabusContent["policies"]): string {
  if (!policies) return "";
  if (typeof policies === "string") return policies;
  try {
    return JSON.stringify(policies, null, 2);
  } catch {
    return String(policies);
  }
}

// ---- main component --------------------------------------------------------

export default function CourseSyllabusTable({
  schedule,
  content,
  sourceUrl,
}: CourseSyllabusTableProps) {
  const normalizeForCompare = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const getEntryKey = (entry: SyllabusEntry, idx: number) =>
    `${idx}|${entry.sequence ?? ""}|${entry.date ?? ""}|${entry.date_end ?? ""}|${entry.title ?? ""}`;
  const [showAllGrading, setShowAllGrading] = useState(false);
  const [showAllObjectives, setShowAllObjectives] = useState(false);
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [deletedEntryKeys, setDeletedEntryKeys] = useState<Set<string>>(new Set());
  const filteredSchedule = schedule.filter((e) => {
    const date = typeof e.date === "string" ? e.date.trim() : "";
    const dateEnd = typeof e.date_end === "string" ? e.date_end.trim() : "";
    return Boolean(date || dateEnd);
  });
  const visibleSchedule = filteredSchedule
    .map((entry, idx) => ({ entry, idx, key: getEntryKey(entry, idx) }))
    .filter(({ key }) => !deletedEntryKeys.has(key));

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

      {visibleSchedule.length > 0 && (
        <div className="space-y-2.5">
          {visibleSchedule.map(({ entry, idx, key: entryKey }) => {
            const title = typeof entry.title === "string" ? entry.title.trim() : "";
            const topics = (entry.topics || [])
              .filter((topic): topic is string => typeof topic === "string" && topic.trim().length > 0)
              .map((topic) => topic.trim());
            const topicsToShow = title
              ? topics.filter((topic) => normalizeForCompare(topic) !== normalizeForCompare(title))
              : topics;
            const description = typeof entry.description === "string" ? entry.description.trim() : "";
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
            const hasMetaSections = allMaterials.length > 0 || allTasks.length > 0 || Boolean(description);

            return (
              <article key={idx} className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-3 w-full">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">Date</p>
                      <p className="text-xs text-[#555] mt-0.5">
                        {entry.date ? `${entry.date}${entry.date_end ? ` - ${entry.date_end}` : ""}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">Instructors Topics</p>
                      {entry.instructor && (
                        <p className="text-xs text-[#555] mt-0.5">{entry.instructor}</p>
                      )}
                      {title && (
                        <p className="text-xs font-semibold text-[#1f1f1f] mt-1">{title}</p>
                      )}
                      {topicsToShow.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {topicsToShow.map((t, i) => (
                            <span key={i} className="inline-block rounded border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-[11px] text-[#444]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium text-[#888] whitespace-nowrap">#{entry.sequence ?? idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletedEntryKeys((prev) => {
                          const next = new Set(prev);
                          next.add(entryKey);
                          return next;
                        });
                      }}
                      className="h-6 w-6 rounded-md border border-[#efcaca] bg-white text-red-600 hover:bg-red-50 inline-flex items-center justify-center"
                      title="Delete syllabus item"
                      aria-label="Delete syllabus item"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {hasMetaSections && (
                  <div className="pt-2 border-t border-[#ececec] space-y-2">
                  {allMaterials.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">Materials</p>
                      <div className="mt-1 space-y-1">
                        {allMaterials.map((m, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-[#aaa] w-12 shrink-0">{m.kind}</span>
                            <MaterialLink item={m} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allTasks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">Tasks</p>
                      <div className="mt-1 space-y-1.5">
                        {allTasks.map((t, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <span className="text-[10px] font-medium text-[#aaa] w-16 shrink-0 pt-0.5">{t.kind}</span>
                            <TaskBadge item={t} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {description && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">Description</p>
                      <p className="text-xs text-[#666] leading-relaxed mt-0.5">{description}</p>
                    </div>
                  )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {(content.grading?.length || content.objectives?.length || content.textbooks?.length || content.policies) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.grading && content.grading.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Grading</h3>
              <div className={showAllGrading ? "" : "line-clamp-3"}>
                <ul className="space-y-1.5">
                  {content.grading.map((g, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-[#555]">{g.component}</span>
                      <span className="font-medium text-[#222]">{g.weight}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setShowAllGrading((v) => !v)}
                className="mt-1 text-xs font-medium text-[#335b9a] hover:underline"
              >
                {showAllGrading ? "Less" : "More"}
              </button>
            </div>
          )}
          {content.objectives && content.objectives.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Objectives</h3>
              <div className={showAllObjectives ? "" : "line-clamp-3"}>
                <ul className="space-y-1.5 list-disc list-inside">
                  {content.objectives.map((o, i) => (
                    <li key={i} className="text-sm text-[#555] leading-relaxed">{o}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setShowAllObjectives((v) => !v)}
                className="mt-1 text-xs font-medium text-[#335b9a] hover:underline"
              >
                {showAllObjectives ? "Less" : "More"}
              </button>
            </div>
          )}
          {content.textbooks && content.textbooks.length > 0 && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Textbooks</h3>
              <ul className="space-y-1.5">
                {content.textbooks.map((t, i) => (
                  (() => {
                    const tb = normalizeTextbook(t);
                    return (
                      <li key={i} className="text-sm text-[#555]">
                        {tb.url ? (
                          <a href={tb.url} target="_blank" rel="noreferrer" className="text-[#335b9a] hover:underline inline-flex items-center gap-1">
                            {tb.title}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span>{tb.title}</span>
                        )}
                        {(tb.authors.length > 0 || tb.required !== null) && (
                          <span className="block text-xs text-[#777]">
                            {tb.authors.length > 0 ? `Authors: ${tb.authors.join(", ")}` : ""}
                            {tb.authors.length > 0 && tb.required !== null ? " • " : ""}
                            {tb.required === true ? "Required" : tb.required === false ? "Optional" : ""}
                          </span>
                        )}
                      </li>
                    );
                  })()
                ))}
              </ul>
            </div>
          )}
          {content.policies && (
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
              <h3 className="text-sm font-semibold text-[#1f1f1f] mb-3">Policies</h3>
              <p className={`text-sm text-[#555] leading-relaxed whitespace-pre-wrap ${showAllPolicies ? "" : "line-clamp-3"}`}>
                {renderPolicies(content.policies)}
              </p>
              <button
                type="button"
                onClick={() => setShowAllPolicies((v) => !v)}
                className="mt-1 text-xs font-medium text-[#335b9a] hover:underline"
              >
                {showAllPolicies ? "Less" : "More"}
              </button>
            </div>
          )}
        </div>
      )}

      {visibleSchedule.length === 0 && (
        <p className="text-sm text-[#888]">No schedule entries found in syllabus.</p>
      )}
    </div>
  );
}
