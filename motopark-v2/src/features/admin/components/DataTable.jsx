import styles from './DataTable.module.css';

/**
 * DataTable — the shared admin table layout. Config-driven so every module
 * (Products, Orders, Customers…) renders the same structure, spacing, and
 * loading/empty states.
 *
 * props:
 *   columns  — [{ key, header, render?, align?, width? }]
 *                render(row) → cell node; defaults to row[key]
 *   rows     — array of row objects
 *   rowKey   — (row, i) => string  key extractor (defaults to row.id ?? i)
 *   loading  — render `skeletonRows` shimmer rows instead of data
 *   skeletonRows — how many placeholder rows while loading (default 6)
 *   empty    — node shown when there are no rows and not loading
 *   onRowClick — optional (row) => void; makes rows interactive
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey,
  loading = false,
  skeletonRows = 6,
  empty = 'No records found.',
  onRowClick,
}) {
  const keyOf = (row, i) => (rowKey ? rowKey(row, i) : row?.id ?? i);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles.th}
                style={{ textAlign: col.align ?? 'left', width: col.width }}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`sk-${r}`} className={styles.tr}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    <span className={`skeleton ${styles.cellSkeleton}`} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td className={styles.emptyCell} colSpan={columns.length}>
                <div className={styles.empty}>{empty}</div>
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, i) => (
              <tr
                key={keyOf(row, i)}
                className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={styles.td}
                    style={{ textAlign: col.align ?? 'left' }}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
