"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { regenerateProjectSeminarDescription, updateProjectSeminarDescription } from "@/actions/projects-seminars";

interface ProjectSeminarAiDescriptionButtonProps {
  projectSeminarId: number;
}

export default function ProjectSeminarAiDescriptionButton({
  projectSeminarId,
}: ProjectSeminarAiDescriptionButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const regenerated = (await regenerateProjectSeminarDescription(projectSeminarId)).trim();
      if (!regenerated) {
        throw new Error("AI returned an empty description");
      }
      setGeneratedDescription(regenerated);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to regenerate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!generatedDescription) return;
    setIsApplying(true);
    try {
      await updateProjectSeminarDescription(projectSeminarId, generatedDescription);
      setGeneratedDescription(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to apply description");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || isApplying}
        className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[12px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
        title="AI Regenerate"
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        AI Regenerate
      </button>

      {generatedDescription ? (
        <div className="rounded-md border border-[#e7e7e7] bg-white p-2.5">
          <p className="text-[12px] text-[#444] whitespace-pre-wrap line-clamp-6">{generatedDescription}</p>
          <div className="mt-2 flex items-center gap-2">
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
              onClick={() => setGeneratedDescription(null)}
              disabled={isApplying}
              className="inline-flex h-7 items-center justify-center rounded-md border border-[#e1e1e1] bg-white px-2.5 text-[12px] font-medium text-[#666] hover:bg-[#fafafa] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
