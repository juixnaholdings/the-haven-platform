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
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/80 pt-4">
      <div className="grid gap-1">
        <strong className="text-sm font-semibold text-slate-800">
          Page {pagination.page} of {pagination.totalPages}
        </strong>
        <span className="text-xs text-slate-500">
          {pagination.count} record{pagination.count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-2.5">
        <label className="grid w-[92px] gap-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Rows
          </span>
          <select
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none ring-0 transition focus:border-[#16335f]/30 focus:ring-2 focus:ring-[#16335f]/10"
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
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!pagination.hasPrevious}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          type="button"
        >
          Previous
        </button>

        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
