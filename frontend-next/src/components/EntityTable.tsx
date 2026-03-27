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
}

export function EntityTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyFallback,
}: EntityTableProps<TRow>) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.header}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={column.className} key={column.header}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                {emptyFallback ?? "No records found."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
