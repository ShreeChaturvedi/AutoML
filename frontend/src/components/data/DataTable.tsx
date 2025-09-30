/**
 * DataTable - Table component for displaying data preview
 *
 * Features:
 * - Uses TanStack Table v8 for performance
 * - Column sorting
 * - Responsive layout
 * - Clean styling with shadcn table components
 *
 * TODO: Add pagination, filtering, column visibility, virtualization for large datasets
 */

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { DataPreview } from '@/types/file';

interface DataTableProps {
  preview: DataPreview;
}

export function DataTable({ preview }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Generate columns from headers
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      preview.headers.map((header) => ({
        accessorKey: header,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();

          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8"
              onClick={() => column.toggleSorting()}
            >
              {header}
              {isSorted === 'asc' ? (
                <ArrowUp className="ml-2 h-3 w-3" />
              ) : isSorted === 'desc' ? (
                <ArrowDown className="ml-2 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className="truncate max-w-[200px] inline-block">
              {String(value ?? '')}
            </span>
          );
        }
      })),
    [preview.headers]
  );

  const table = useReactTable({
    data: preview.rows,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={columns.length} className="text-xs font-mono">
              {preview.totalRows.toLocaleString()} rows × {preview.headers.length} columns
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}