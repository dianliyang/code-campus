"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontalIcon } from "lucide-react";
import { toggleCourseEnrollmentAction, hideCourseAction } from "@/actions/courses";
import { useState } from "react";

export interface CourseTableRow {
  id: number;
  title: string;
  university: string;
  courseCode: string;
  subdomain?: string | null;
  fields?: string[];
  credit?: number | null;
  latestSemester: string | null;
  detailHref: string;
}

export interface CourseTableMeta {
  enrolledIds: number[];
  onEnrollToggle: () => Promise<void> | void;
  onHide: (courseId: number) => void;
}

function CourseRowActions({ row, meta }: { row: CourseTableRow; meta: CourseTableMeta }) {
  const [loading, setLoading] = useState(false);
  const isEnrolled = meta.enrolledIds.includes(row.id);

  const handleEnroll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await toggleCourseEnrollmentAction(row.id, isEnrolled);
      await meta.onEnrollToggle();
    } catch (error) {
      console.error("Enrollment failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await hideCourseAction(row.id);
      meta.onHide(row.id);
    } catch (error) {
      console.error("Hide failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <MoreHorizontalIcon />}
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEnroll}>
          {isEnrolled ? "Unenroll" : "Enroll"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleHide}>
          Hide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const courseColumns: ColumnDef<CourseTableRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select ${row.original.title}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: "Course",
    cell: ({ row }) => {
      const course = row.original;
      const primaryField = course.subdomain || course.fields?.[0];
      return (
        <div className="min-w-0 flex items-center gap-3">
          <UniversityIcon name={course.university} size={26} className="bg-white border border-[#dfdfdf]" />
          <div className="min-w-0">
            <Link href={course.detailHref} prefetch={false} className="block">
              <h2 className="text-[14px] md:text-[15px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate hover:text-black transition-colors">
                {course.title}
              </h2>
              <p className="text-xs text-[#7a7a7a] truncate">{course.courseCode} · {course.university}</p>
            </Link>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
              {course.latestSemester ? <Badge className="bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{course.latestSemester}</Badge> : null}
              {course.credit != null ? <Badge className="bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{course.credit} cr</Badge> : null}
              {primaryField ? <Badge className="max-w-[130px] truncate bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">{primaryField}</Badge> : null}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "subdomain",
    header: "Subdomain",
    cell: ({ row }) => <span className="text-[13px] text-[#444] truncate">{row.original.subdomain || "-"}</span>,
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => <span className="text-sm text-[#484848]">{row.original.credit ?? "-"}</span>,
  },
  {
    accessorKey: "latestSemester",
    header: "Semester",
    cell: ({ row }) => <span className="text-sm text-[#484848]">{row.original.latestSemester ?? "-"}</span>,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Action</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as CourseTableMeta;
      return <CourseRowActions row={row.original} meta={meta} />;
    },
    enableSorting: false,
    enableHiding: false,
  },
];
