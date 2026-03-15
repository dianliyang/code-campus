"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable } from
"@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  // TanStack Table exposes instance methods that React Compiler intentionally skips memoizing.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="min-w-[760px]">
    <Table className="table-auto">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) =>
        <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
          const width = header.column.columnDef.size;
          return (
          <TableHead
            key={header.id}
            style={width != null ? { width } : undefined}
          >
                {header.isPlaceholder ?
            null :
            flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
          );
        })}
          </TableRow>
        )}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ?
        table.getRowModel().rows.map((row) =>
        <TableRow
          key={row.id}>

          
              {row.getVisibleCells().map((cell) => {
          const width = cell.column.columnDef.size;
          return (
          <TableCell
            key={cell.id}
            style={width != null ? { width } : undefined}
          >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
          );
        })}
            </TableRow>
        ) :

        <TableRow>
            <TableCell colSpan={columns.length}>
              {" "}
            </TableCell>
          </TableRow>
        }
      </TableBody>
    </Table>
    </div>);

}
