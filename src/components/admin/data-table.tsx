"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Button } from "@/components/ui/button";

export interface Column<T> {
  header: string;
  accessor?: keyof T | string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface FilterOption<T> {
  label: string;
  key: keyof T | string;
  options: { label: string; value: string }[];
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  filters?: FilterOption<T>[];
  pageSize?: number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchFields = [],
  filters = [],
  pageSize = 10,
  isLoading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no items matching your filter or query.",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered & Sorted Data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm.trim() && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field as string];
          if (val == null) return false;
          return String(val).toLowerCase().includes(term);
        })
      );
    }

    // Dropdown filters
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (!val || val === "all") return;
      result = result.filter((item) => String(item[key]) === val);
    });

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortDirection === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, searchTerm, searchFields, activeFilters, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full h-9 rounded-md border border-border-input bg-surface pl-8 pr-8 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 placeholder:text-muted"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <select
                key={String(f.key)}
                value={activeFilters[String(f.key)] || "all"}
                onChange={(e) => handleFilterChange(String(f.key), e.target.value)}
                className="h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 min-w-[120px]"
              >
                <option value="all">All {f.label}</option>
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bgSubtle text-[11px] uppercase tracking-wider text-muted font-medium">
              <tr>
                {columns.map((col, idx) => {
                  const field = (col.accessor as string) || `col-${idx}`;
                  const isSorted = sortField === field;

                  return (
                    <th key={idx} className={`py-3 px-4 ${col.className || ""}`}>
                      {col.sortable && col.accessor ? (
                        <button
                          type="button"
                          onClick={() => handleSort(field)}
                          className="flex items-center gap-1.5 hover:text-fg transition font-medium"
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="py-3 px-4">
                        <div className="h-4 w-3/4 rounded bg-bgSubtle" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 px-4 text-center">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rIdx) => (
                  <tr key={item.id || rIdx} className="hover:bg-surfaceHover transition">
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`py-3.5 px-4 ${col.className || ""}`}>
                        {col.render ? col.render(item) : String(item[col.accessor as string] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
            <div>
              Showing <span className="font-semibold text-fg">{(currentPage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-semibold text-fg">{Math.min(currentPage * pageSize, filteredData.length)}</span> of{" "}
              <span className="font-semibold text-fg">{filteredData.length}</span> results
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={13} className="mr-1" /> Previous
              </Button>
              <span className="font-medium px-2 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight size={13} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
