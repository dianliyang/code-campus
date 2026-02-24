"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Loader2, Sparkles } from "lucide-react";
import { trackAiUsage } from "@/lib/ai/usage";

type PlannerResult = {
  track: string;
  overview: string;
  roadmap: Array<{
    phase: string;
    goal: string;
    courses: Array<{ id: number; title: string; course_code: string; university: string; why: string }>;
  }>;
  study_plan: Array<{ week: number; focus: string; tasks: string[] }>;
};

const PRESETS = ["AI Infra", "ML Systems", "LLM Engineering", "Data Engineering", "Security Engineering"];

export default function AILearningPlanner() {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);

  const allCourseIds = useMemo(
    () => Array.from(new Set((result?.roadmap || []).flatMap((p) => (p.courses || []).map((c) => c.id)))),
    [result]
  );

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const applyRoadmap = async () => {
    if (!result || selectedCourseIds.length === 0) return;
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/ai/planner/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCourseIds, studyPlan: result.study_plan }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to apply roadmap");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply roadmap");
    } finally {
      setApplying(false);
    }
  };

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to generate roadmap");
      const next = body.result as PlannerResult;
      setResult(next);
      const ids = Array.from(
        new Set((next.roadmap || []).flatMap((p) => (p.courses || []).map((c) => c.id)))
      );
      setSelectedCourseIds(ids);
      trackAiUsage({ calls: 1, tokens: 1800 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate roadmap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-md border border-[#e5e5e5] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-[#222]">AI Learning Planner</h4>
          <p className="text-xs text-[#666] mt-1">Pick a practical track and generate a full roadmap + weekly study plan.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="h-8 rounded-md border border-[#d7d7d7] bg-white px-2.5 text-[13px] text-[#454545]"
          >
            {PRESETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={loading}
            className="h-8 rounded-md border border-[#d3d3d3] bg-white px-3 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate
          </button>
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {result ? (
        <div className="space-y-3">
          <div className="rounded-md border border-[#ececec] p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-semibold text-[#1f1f1f]">Courses to enroll</p>
              <button
                onClick={() => setSelectedCourseIds(allCourseIds)}
                className="text-[11px] text-[#3b82f6] hover:underline"
                type="button"
              >
                Select all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-40 overflow-auto pr-1">
              {allCourseIds.map((id) => {
                const c = (result.roadmap || []).flatMap((p) => p.courses || []).find((x) => x.id === id);
                if (!c) return null;
                const checked = selectedCourseIds.includes(id);
                return (
                  <label key={id} className="flex items-start gap-2 text-xs text-[#444]">
                    <input type="checkbox" checked={checked} onChange={() => toggleCourse(id)} className="mt-0.5" />
                    <span>{c.course_code} · {c.title}</span>
                  </label>
                );
              })}
            </div>
            <button
              onClick={applyRoadmap}
              disabled={applying || selectedCourseIds.length === 0}
              className="mt-3 h-8 rounded-md border border-[#d3d3d3] bg-white px-3 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
              Enroll selected + create study plans
            </button>
          </div>

          <div className="rounded-md border border-[#ececec] bg-[#fafafa] p-3">
            <p className="text-xs font-semibold text-[#1f1f1f]">{result.track}</p>
            <p className="text-xs text-[#666] mt-1">{result.overview}</p>
          </div>

          <div className="space-y-2">
            {result.roadmap?.map((phase, idx) => (
              <div key={`${phase.phase}-${idx}`} className="rounded-md border border-[#ececec] p-3">
                <p className="text-xs font-semibold text-[#1f1f1f]">{phase.phase}</p>
                <p className="text-xs text-[#666] mt-1">{phase.goal}</p>
                <ul className="mt-2 space-y-1">
                  {phase.courses?.map((c) => (
                    <li key={c.id} className="text-xs text-[#3b3b3b]">
                      {c.course_code} · {c.title} ({c.university}) — {c.why}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-[#ececec] p-3">
            <p className="text-xs font-semibold text-[#1f1f1f] mb-2">Weekly Study Plan</p>
            <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
              {result.study_plan?.map((w) => (
                <div key={w.week} className="text-xs text-[#444]">
                  <span className="font-semibold">Week {w.week}:</span> {w.focus}
                  {w.tasks?.length ? (
                    <ul className="list-disc ml-4 mt-0.5 text-[#666]">
                      {w.tasks.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
