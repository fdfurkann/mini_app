import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps {
  columns: Array<{ accessorKey: string; header: string; cell?: (info: any) => React.ReactNode }>;
  data: any[];
  loading: boolean;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  isMobile?: boolean;
  expandedRows?: Record<number, boolean>;
  renderExpandedRow?: (row: any) => React.ReactNode;
  onRowClick?: (id: number) => void;
  getRowId?: (row: any) => number;
}

export function DataTable({
  columns,
  data,
  loading,
  total,
  page,
  onPageChange,
  pageSize = 30,
  isMobile,
  expandedRows,
  renderExpandedRow,
  onRowClick,
  getRowId = (row) => row.id,
}: DataTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-card">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessorKey}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">Yükleniyor...</TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">Veri bulunamadı</TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isExpanded = expandedRows ? expandedRows[rowId] : false;
              return (
                <React.Fragment key={rowId !== undefined ? rowId : rowIndex}>
                  <TableRow
                    className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                    onClick={() => onRowClick && onRowClick(rowId)}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.accessorKey}>
                        {column.cell ? column.cell({ row }) : row[column.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isMobile && isExpanded && renderExpandedRow && (
                    renderExpandedRow(row)
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 0 && (
        <div className="flex items-center justify-end space-x-2 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Sayfa {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}