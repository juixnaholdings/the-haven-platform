import type { ListPaginationMeta } from "../domains/types";

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
    <div className="pagination-controls">
      <div className="pagination-summary">
        <strong>
          Page {pagination.page} of {pagination.totalPages}
        </strong>
        <span>
          {pagination.count} record{pagination.count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="pagination-actions">
        <label className="field pagination-size-field">
          <span>Rows</span>
          <select
            value={pagination.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
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
