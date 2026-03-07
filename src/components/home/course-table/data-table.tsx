"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  OnChangeFn,
  RowSelectionState,
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
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  getRowId: (originalRow: TData) => string;
  meta?: object;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  meta
}: DataTableProps<TData, TValue>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    onRowSelectionChange,
    state: { rowSelection },
    getRowId,
    meta
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) =>
        <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) =>
          <TableHead key={header.id}>
                {header.isPlaceholder ?
            null :
            flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
          )}
          </TableRow>
        )}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ?
        table.getRowModel().rows.map((row) =>
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() && "selected"}>

          
              {row.getVisibleCells().map((cell) =>
          <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
          )}
            </TableRow>
        ) :

        <TableRow>
            <TableCell colSpan={columns.length}>
              No results.
            </TableCell>
          </TableRow>
        }
      </TableBody>
    </Table>);

}
