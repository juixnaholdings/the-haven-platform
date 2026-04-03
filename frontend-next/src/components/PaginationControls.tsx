import type { ListPaginationMeta } from "@/domains/types";

interface PaginationControlsProps {
  pagination: ListPaginationMeta | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationControlsProps) {
  if (!pagination) {
    return null;
  }

  const mergedPageSizeOptions = [...new Set([...pageSizeOptions, pagination.pageSize])].sort(
    (left, right) => left - right,
  );

  return (
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-5">
      <div className="grid gap-1">
        <strong className="text-sm font-semibold text-slate-800">
          Page {pagination.page} of {pagination.totalPages}
        </strong>
        <span className="text-xs text-slate-500">
          {pagination.count} record{pagination.count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2.5">
        <label className="field pagination-size-field">
          <span>Rows</span>
          <select
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pagination.pageSize}
          >
            {mergedPageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          className="button button-secondary button-compact"
          disabled={!pagination.hasPrevious}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          type="button"
        >
          Previous
        </button>

        <button
          className="button button-secondary button-compact"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
