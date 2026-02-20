"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  regenerateProjectSeminarDescription,
  updateProjectSeminarDescription,
} from "@/actions/projects-seminars";

interface ProjectSeminarContentsPanelProps {
  projectSeminarId: number;
  initialContents: string;
}

const AI_DESCRIPTION_MARK = "AI Regenerated";

function appendAiDescriptionMark(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (trimmed.toLowerCase().endsWith(AI_DESCRIPTION_MARK.toLowerCase())) {
    return trimmed;
  }
  const looksLikeHtml = /<[^>]+>/.test(trimmed);
  if (looksLikeHtml) {
    return `${trimmed}<p>${AI_DESCRIPTION_MARK}</p>`;
  }
  return `${trimmed}\n\n${AI_DESCRIPTION_MARK}`;
}

function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|meta|link)\b[\s\S]*?>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\shref="javascript:[^"]*"/gi, ' href="#"')
    .replace(/\shref='javascript:[^']*'/gi, " href='#'");
}

export default function ProjectSeminarContentsPanel({
  projectSeminarId,
  initialContents,
}: ProjectSeminarContentsPanelProps) {
  const [persistedContents, setPersistedContents] = useState(initialContents);
  const [displayedContents, setDisplayedContents] = useState(initialContents);
  const [generatedContents, setGeneratedContents] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const hasAiRegenerated = persistedContents.toLowerCase().includes(AI_DESCRIPTION_MARK.toLowerCase());

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const regenerated = (await regenerateProjectSeminarDescription(projectSeminarId)).trim();
      if (!regenerated) {
        throw new Error("AI returned an empty description");
      }
      setGeneratedContents(regenerated);
      setDisplayedContents(regenerated);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to regenerate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!generatedContents) return;
    setIsApplying(true);
    try {
      const marked = appendAiDescriptionMark(generatedContents);
      await updateProjectSeminarDescription(projectSeminarId, marked);
      setPersistedContents(marked);
      setDisplayedContents(marked);
      setGeneratedContents(null);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to apply description");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    setGeneratedContents(null);
    setDisplayedContents(persistedContents);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#2a2a2a]">Contents</h2>
        {hasAiRegenerated && !generatedContents ? (
          <span className="inline-flex h-7 items-center rounded-full border border-[#e1e1e1] bg-white px-2.5 text-[12px] font-medium text-[#666]">
            AI Regenerated
          </span>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || isApplying}
            className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[12px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
            title="AI Regenerate"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Regenerate
          </button>
        )}
      </div>

      {generatedContents ? (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="inline-flex h-7 items-center justify-center rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[12px] font-medium text-[#333] hover:bg-[#f8f8f8] disabled:opacity-50"
          >
            {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isApplying}
            className="inline-flex h-7 items-center justify-center rounded-md border border-[#e1e1e1] bg-white px-2.5 text-[12px] font-medium text-[#666] hover:bg-[#fafafa] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div
        className="text-sm text-[#444] leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayedContents) }}
      />
    </div>
  );
}
