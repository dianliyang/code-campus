"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { regenerateProjectSeminarDescription, updateProjectSeminarDescription } from "@/actions/projects-seminars";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";import { Card } from "@/components/ui/card";

interface ProjectSeminarAiDescriptionButtonProps {
  projectSeminarId: number;
}

export default function ProjectSeminarAiDescriptionButton({
  projectSeminarId
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
      toast.error(error instanceof Error ? error.message : "Failed to regenerate description", { position: "bottom-right" });
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
      toast.error(error instanceof Error ? error.message : "Failed to apply description", { position: "bottom-right" });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline"
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating || isApplying}

      title="AI Regenerate">
        
        {isGenerating ?
        <Loader2 className="animate-spin" /> :

        <Sparkles />
        }
        AI Regenerate
      </Button>

      {generatedDescription ?
      <Card>
          <p className="text-[12px] text-[#444] whitespace-pre-wrap line-clamp-6">{generatedDescription}</p>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="outline"
          type="button"
          onClick={handleApply}
          disabled={isApplying}>

            
              {isApplying ? <Loader2 className="animate-spin" /> : "Apply"}
            </Button>
            <Button variant="outline"
          type="button"
          onClick={() => setGeneratedDescription(null)}
          disabled={isApplying}>

            
              Cancel
            </Button>
          </div>
        </Card> :
      null}
    </div>);

}