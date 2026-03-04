"use client";

import { projectSeminarColumns, type ProjectSeminarTableRow } from "./columns";
import { DataTable } from "./data-table";

interface ProjectsSeminarsDataTableProps {
  rows: ProjectSeminarTableRow[];
}

export default function ProjectsSeminarsDataTable({ rows }: ProjectsSeminarsDataTableProps) {
  return <DataTable columns={projectSeminarColumns} data={rows} />;
}
