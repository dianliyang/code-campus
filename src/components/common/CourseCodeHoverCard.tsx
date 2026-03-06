"use client";

import React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { Copy, BookOpen, GraduationCap, MapPin } from "lucide-react";
import UniversityIcon from "@/components/common/UniversityIcon";

interface CourseCodeHoverCardProps {
  university: string;
  courseCode: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function CourseCodeHoverCard({
  university,
  courseCode,
  title,
  className,
  children,
}: CourseCodeHoverCardProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText(courseCode);
    toast.success("Course code copied", {
      description: courseCode,
      duration: 2000,
    });
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 cursor-copy hover:text-foreground transition-colors group ${className}`}
        >
          {children || (
            <>
              <span>{courseCode}</span>
              <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                ·
              </span>
              <span>{university}</span>
            </>
          )}
          <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity ml-0.5" />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
              <UniversityIcon name={university} size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold leading-none truncate">{courseCode}</h4>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                {university}
              </p>
            </div>
          </div>
          
          {title && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>Course Title</span>
              </div>
              <p className="text-sm font-medium leading-snug line-clamp-2">
                {title}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-md bg-muted/40 p-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <GraduationCap className="h-2.5 w-2.5" />
                <span>Level</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase">Regular</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                <span>Status</span>
              </div>
              <p className="mt-0.5 text-xs font-semibold uppercase text-emerald-600">Active</p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic border-t pt-2">
            Click code to copy to clipboard.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
