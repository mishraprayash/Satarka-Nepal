import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";

export function usePagination<T>(items: T[], itemsPerPage: number) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  
  // Ensure current page is valid when items change
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedItems = useMemo(() => {
    const start = (validCurrentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, validCurrentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  return {
    currentPage: validCurrentPage,
    totalPages,
    paginatedItems,
    goToPage,
  };
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  className
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2 mt-8", className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors"
      >
        Previous
      </button>
      
      <span className="text-sm font-medium text-muted mx-4">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-surface text-text disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
