"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Loader2, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  status: "Enrolled" | "Not Enrolled";
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
      await toggleProjectSeminarEnrollmentAction(row.id, row.status === "Enrolled");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update enrollment", { position: "bottom-right" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <MoreHorizontalIcon />}
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleToggleEnrollment}>
          {row.status === "Enrolled" ? "Unenroll" : "Enroll"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.url ? (
          <DropdownMenuItem asChild>
            <a href={row.url} target="_blank" rel="noreferrer">
              Open seminar
              <ExternalLink className="ml-auto w-3 h-3" />
            </a>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>Open seminar</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const projectSeminarColumns: ColumnDef<ProjectSeminarTableRow>[] = [
  {
    accessorKey: "title",
    header: "S&P",
    cell: ({ row }) => (
      <div>
        <h3 className="text-[14px] font-medium text-[#222] truncate">
          <Link href={`/projects-seminars/${row.original.id}`} className="hover:text-black transition-colors">
            {row.original.title}
          </Link>
        </h3>
        <p className="text-[12px] text-[#717171] mt-0.5">
          {row.original.courseCode} · {row.original.university}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span className="text-[12px] text-[#555]">{row.original.category}</span>,
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => <span className="text-[12px] text-[#555] truncate">{row.original.department}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`inline-flex border px-2 py-0.5 text-[11px] font-medium ${status === "Enrolled" ? "border-green-100 bg-green-50 text-green-700" : "border-[#e5e5e5] bg-[#f3f3f3] text-[#666]"}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => <span className="text-[12px] text-[#555]">{row.original.credit ?? "-"}</span>,
  },
  {
    accessorKey: "semesterLabel",
    header: "Semester",
    cell: ({ row }) => <span className="text-[12px] text-[#555]">{row.original.semesterLabel}</span>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row }) => <ProjectSeminarRowActions row={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];
