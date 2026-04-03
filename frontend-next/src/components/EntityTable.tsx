import type { ReactNode } from "react";

interface EntityTableColumn<TRow> {
  header: string;
  cell: (row: TRow) => ReactNode;
  className?: string;
}

interface EntityTableProps<TRow> {
  columns: EntityTableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow) => string | number;
  emptyFallback?: ReactNode;
  className?: string;
}

export function EntityTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyFallback,
  className,
}: EntityTableProps<TRow>) {
  const tableWrapClassName = className
    ? `overflow-x-auto rounded-2xl border border-slate-200/80 bg-white ${className}`
    : "overflow-x-auto rounded-2xl border border-slate-200/80 bg-white";

  return (
    <div className={tableWrapClassName}>
      <table className="min-w-[760px] w-full border-separate border-spacing-0">
        <thead className="bg-[#f7f2e9]/70">
          <tr>
            {columns.map((column) => (
              <th
                className={`border-b border-slate-200/70 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500 ${column.className ?? ""}`}
                key={column.header}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr className="transition hover:bg-slate-50/80" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    className={`border-b border-slate-100 px-4 py-3 align-top text-sm text-slate-700 last:border-b-0 ${column.className ?? ""}`}
                    key={column.header}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="px-4 py-6 text-center text-sm text-slate-500"
                colSpan={columns.length}
              >
                {emptyFallback ?? "No records found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
