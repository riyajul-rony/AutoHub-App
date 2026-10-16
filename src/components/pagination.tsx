import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize?: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize = 50,
  basePath,
  searchParams = {},
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0 || totalPages <= 1) {
    return null;
  }

  const startRecord = Math.min(totalCount, (currentPage - 1) * pageSize + 1);
  const endRecord = Math.min(totalCount, currentPage * pageSize);

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") {
        params.set(key, value);
      }
    }
    params.set("page", page.toString());
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-border text-xs text-muted">
      <div>
        Showing <span className="font-semibold text-fg">{startRecord}</span>–
        <span className="font-semibold text-fg">{endRecord}</span> of{" "}
        <span className="font-semibold text-fg">{totalCount.toLocaleString()}</span> items
      </div>

      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md border border-border bg-bgSubtle text-fg font-medium text-xs">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          {hasPrev ? (
            <Link
              href={buildUrl(currentPage - 1)}
              className="h-8 w-8 rounded-md border border-border bg-surface hover:bg-surfaceHover text-fg flex items-center justify-center transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <button
              disabled
              className="h-8 w-8 rounded-md border border-border bg-bgSubtle text-subtle flex items-center justify-center opacity-40 cursor-not-allowed"
              aria-label="Previous page (disabled)"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {hasNext ? (
            <Link
              href={buildUrl(currentPage + 1)}
              className="h-8 w-8 rounded-md border border-border bg-surface hover:bg-surfaceHover text-fg flex items-center justify-center transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Link>
          ) : (
            <button
              disabled
              className="h-8 w-8 rounded-md border border-border bg-bgSubtle text-subtle flex items-center justify-center opacity-40 cursor-not-allowed"
              aria-label="Next page (disabled)"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
