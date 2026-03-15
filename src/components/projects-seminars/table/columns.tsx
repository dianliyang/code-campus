"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Check, ExternalLink, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleProjectSeminarEnrollmentAction } from "@/actions/projects-seminars";
import { useState } from "react";
import { toast } from "sonner";

export interface ProjectSeminarTableRow {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  category: string;
  department: string;
  enrolled: boolean;
  credit: number | null;
  semesterLabel: string;
  url: string | null;
}

function ProjectSeminarRowActions({ row }: { row: ProjectSeminarTableRow }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleEnrollment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await toggleProjectSeminarEnrollmentAction(row.id, row.enrolled);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update enrollment", { position: "bottom-right" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-end gap-1.5">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={isSubmitting}
        onClick={() => void handleToggleEnrollment()}
        aria-label={row.enrolled ? "Unenroll" : "Enroll"}
        title={row.enrolled ? "Unenroll" : "Enroll"}
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : row.enrolled ? <Check /> : <UserPlus />}
      </Button>
      {row.url ? (
        <Button variant="outline" size="icon-sm" asChild>
          <a href={row.url} target="_blank" rel="noreferrer" aria-label="Open seminar" title="Open seminar">
            <ExternalLink />
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="icon-sm" disabled aria-label="Open seminar unavailable" title="Open seminar unavailable">
          <ExternalLink />
        </Button>
      )}
    </div>
  );
}

export const projectSeminarColumns: ColumnDef<ProjectSeminarTableRow>[] = [
  {
    accessorKey: "title",
    header: "S&P",
    cell: ({ row }) => (
      <div className="flex min-h-10 min-w-0 max-w-full flex-col justify-center overflow-hidden">
        <h3 className="min-w-0 max-w-full overflow-hidden text-[14px] font-medium text-[#222]">
          <Link
            href={`/projects-seminars/${row.original.id}`}
            className="block max-w-full truncate hover:text-black transition-colors"
            title={row.original.title}
          >
            {row.original.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[12px] text-[#717171]">
          {row.original.courseCode} · {row.original.university}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    size: 120,
    cell: ({ row }) => <span className="inline-block max-w-full truncate whitespace-nowrap text-[12px] text-[#555]">{row.original.category}</span>,
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <span className="text-[12px] text-[#555] truncate">{row.original.department}</span>,
  },
  {
    accessorKey: "credit",
    header: "Credit",
    size: 76,
    cell: ({ row }) => <span className="inline-block whitespace-nowrap text-[12px] text-[#555]">{row.original.credit ?? "-"}</span>,
  },
  {
    accessorKey: "semesterLabel",
    header: "Semester",
    size: 120,
    cell: ({ row }) => <span className="inline-block whitespace-nowrap text-[12px] text-[#555]">{row.original.semesterLabel}</span>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => <ProjectSeminarRowActions row={row.original} />,
    size: 96,
    enableSorting: false,
    enableHiding: false,
  },
];
