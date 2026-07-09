import React from 'react';

interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

function getCellValue<T>(row: T, key: keyof T | string): React.ReactNode {
  if (key in (row as object)) {
    const val = (row as Record<string, unknown>)[key as string];
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }
  return '—';
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyMessage = 'No results found.',
  loading = false,
}: DataTableProps<T>): React.JSX.Element {
  if (loading) {
    return (
      <div className="table-container">
        <div className="loading-text">Loading…</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key as string} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'clickable' : undefined}
            >
              {columns.map((col) => (
                <td key={col.key as string}>
                  {col.render ? col.render(row) : getCellValue(row, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
