import { useState, useMemo, useCallback, memo } from "react";
import "./AdminLayout.css";

/* ================================================================
   DATATABLE
   A fully-featured reusable table component.

   Props:
     columns       Array<{ key, label, sortable?, render?, width? }>
     data          Array<object>  — raw rows
     keyField      string         — unique ID field (default: "id")
     loading       boolean        — show skeleton rows
     skeletonRows  number         — how many skeleton rows (default: 8)
     searchKeys    Array<string>  — which fields to search across
     filters       Array<{ key, label, options: [{value, label}] }>
     rowActions    Array<{ label, icon?, onClick(row), danger? }>
     bulkActions   Array<{ label, icon?, onClick(selectedIds), danger? }>
     emptyTitle    string
     emptyMessage  string
     pageSize      number         — rows per page (default: 10)
     onRowClick    (row) => void  — optional row click handler
   ================================================================ */

/* ── Sort icon ── */
const SortIcon = memo(({ dir }) => (
    <svg width="10" height="10" viewBox="0 0 10 12" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        strokeLinejoin="round" className="sort-icon" aria-hidden="true">
        {dir === "asc"  && <><path d="M5 2v8M2 5l3-3 3 3"/></>}
        {dir === "desc" && <><path d="M5 2v8M2 9l3 3 3-3"/></>}
        {!dir           && <><path d="M5 2v8M2 5l3-3 3 3M2 9l3 3 3-3" opacity="0.4"/></>}
    </svg>
));
SortIcon.displayName = "SortIcon";

/* ── Search icon ── */
const SearchIco = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

/* ── Chevrons ── */
const ChevLeft = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);
const ChevRight = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/* ── Skeleton row ── */
const SkeletonRow = memo(({ cols }) => (
    <tr className="table-skel">
        {cols.map((_, i) => (
            <td key={i}>
                <div
                    className="table-skel__cell"
                    style={{ width: i === 0 ? "60%" : i % 2 ? "80%" : "50%" }}
                />
            </td>
        ))}
    </tr>
));
SkeletonRow.displayName = "SkeletonRow";

/* ================================================================
   DATATABLE COMPONENT
   ================================================================ */
const DataTable = ({
    columns = [],
    data = [],
    keyField = "id",
    loading = false,
    skeletonRows = 8,
    searchKeys = [],
    filters = [],
    rowActions = [],
    bulkActions = [],
    emptyTitle = "No results found",
    emptyMessage = "Try adjusting your search or filters.",
    pageSize = 10,
    onRowClick,
}) => {
    const [search, setSearch]         = useState("");
    const [filterVals, setFilterVals] = useState({});
    const [sortKey, setSortKey]       = useState(null);
    const [sortDir, setSortDir]       = useState("asc");
    const [selected, setSelected]     = useState(new Set());
    const [page, setPage]             = useState(1);

    /* ── Search & filter ── */
    const filtered = useMemo(() => {
        let rows = data;

        // Text search
        if (search.trim() && searchKeys.length) {
            const q = search.toLowerCase();
            rows = rows.filter((row) =>
                searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
            );
        }

        // Dropdown filters
        Object.entries(filterVals).forEach(([k, v]) => {
            if (v) rows = rows.filter((row) => String(row[k]) === v);
        });

        return rows;
    }, [data, search, searchKeys, filterVals]);

    /* ── Sort ── */
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] ?? "";
            const bv = b[sortKey] ?? "";
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    /* ── Pagination ── */
    const pageCount  = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage   = Math.min(page, pageCount);
    const paged      = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, safePage, pageSize]);

    /* ── Handlers ── */
    const handleSort = useCallback((col) => {
        if (!col.sortable) return;
        setSortKey((prev) => {
            if (prev === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            else { setSortDir("asc"); }
            return col.key;
        });
        setPage(1);
    }, []);

    const handleSearch = useCallback((e) => {
        setSearch(e.target.value);
        setPage(1);
        setSelected(new Set());
    }, []);

    const handleFilter = useCallback((key, val) => {
        setFilterVals((prev) => ({ ...prev, [key]: val }));
        setPage(1);
        setSelected(new Set());
    }, []);

    const toggleRow = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (selected.size === paged.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(paged.map((r) => r[keyField])));
        }
    }, [paged, selected.size, keyField]);

    const clearSelected = useCallback(() => setSelected(new Set()), []);

    const allChecked     = paged.length > 0 && selected.size === paged.length;
    const someChecked    = selected.size > 0 && !allChecked;
    const hasSelected    = selected.size > 0;
    const hasBulk        = bulkActions.length > 0;

    /* ── Pagination pages ── */
    const pageNums = useMemo(() => {
        const nums = [];
        const delta = 1;
        for (let i = 1; i <= pageCount; i++) {
            if (i === 1 || i === pageCount || (i >= safePage - delta && i <= safePage + delta)) {
                nums.push(i);
            } else if (nums[nums.length - 1] !== "…") {
                nums.push("…");
            }
        }
        return nums;
    }, [pageCount, safePage]);

    return (
        <div className="table-wrap">
            {/* ── Toolbar ── */}
            <div className="table-toolbar">
                <div className="table-toolbar__left">
                    {/* Search */}
                    {searchKeys.length > 0 && (
                        <label className="table-search" aria-label="Search">
                            <SearchIco />
                            <input
                                type="search"
                                placeholder="Search…"
                                value={search}
                                onChange={handleSearch}
                                aria-label="Search rows"
                            />
                        </label>
                    )}

                    {/* Filters */}
                    {filters.map((f) => (
                        <select
                            key={f.key}
                            className="table-select"
                            value={filterVals[f.key] ?? ""}
                            onChange={(e) => handleFilter(f.key, e.target.value)}
                            aria-label={`Filter by ${f.label}`}
                        >
                            <option value="">{f.label}</option>
                            {f.options.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    ))}
                </div>

                <div className="table-toolbar__right">
                    <span style={{ fontSize: 12, color: "var(--t-secondary)" }}>
                        {loading ? "Loading…" : `${filtered.length} row${filtered.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
            </div>

            {/* ── Bulk action bar ── */}
            {hasSelected && hasBulk && (
                <div className="bulk-bar" role="toolbar" aria-label="Bulk actions">
                    <span className="bulk-bar__count">{selected.size} selected</span>
                    {bulkActions.map((action) => (
                        <button
                            key={action.label}
                            className={`btn btn--sm${action.danger ? " btn--danger" : " btn--ghost"}`}
                            onClick={() => { action.onClick([...selected]); clearSelected(); }}
                        >
                            {action.icon && <span aria-hidden="true">{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}
                    <button
                        className="btn btn--sm btn--ghost"
                        style={{ marginLeft: "auto" }}
                        onClick={clearSelected}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* ── Table ── */}
            <div style={{ overflowX: "auto" }}>
                <table className="data-table" role="grid">
                    <thead>
                        <tr>
                            {/* Checkbox */}
                            {hasBulk && (
                                <th className="col-check">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={(el) => el && (el.indeterminate = someChecked)}
                                        onChange={toggleAll}
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={col.sortable ? "sortable" + (sortKey === col.key ? " sorted" : "") : ""}
                                    onClick={() => handleSort(col)}
                                    style={col.width ? { width: col.width } : {}}
                                    aria-sort={
                                        sortKey === col.key
                                            ? sortDir === "asc" ? "ascending" : "descending"
                                            : undefined
                                    }
                                >
                                    {col.label}
                                    {col.sortable && (
                                        <SortIcon dir={sortKey === col.key ? sortDir : null} />
                                    )}
                                </th>
                            ))}
                            {rowActions.length > 0 && (
                                <th style={{ width: 60, textAlign: "right" }}>Actions</th>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            /* Skeleton rows */
                            [...Array(skeletonRows)].map((_, i) => (
                                <SkeletonRow
                                    key={i}
                                    cols={hasBulk ? [null, ...columns] : columns}
                                />
                            ))
                        ) : paged.length === 0 ? (
                            /* Empty state */
                            <tr>
                                <td
                                    colSpan={columns.length + (hasBulk ? 1 : 0) + (rowActions.length ? 1 : 0)}
                                    style={{ padding: 0 }}
                                >
                                    <div className="table-empty" role="status">
                                        <div className="table-empty__icon">🗃</div>
                                        <div className="table-empty__title">{emptyTitle}</div>
                                        <div className="table-empty__sub">{emptyMessage}</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paged.map((row) => {
                                const id = row[keyField];
                                const isSelected = selected.has(id);
                                return (
                                    <tr
                                        key={id}
                                        className={isSelected ? "selected" : ""}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        style={onRowClick ? { cursor: "pointer" } : {}}
                                    >
                                        {hasBulk && (
                                            <td className="col-check" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(id)}
                                                    aria-label={`Select row ${id}`}
                                                />
                                            </td>
                                        )}
                                        {columns.map((col) => (
                                            <td key={col.key} className={col.muted ? "muted" : ""}>
                                                {col.render
                                                    ? col.render(row[col.key], row)
                                                    : (row[col.key] ?? "—")}
                                            </td>
                                        ))}
                                        {rowActions.length > 0 && (
                                            <td onClick={(e) => e.stopPropagation()}
                                                style={{ textAlign: "right" }}>
                                                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                                    {rowActions.map((action) => (
                                                        <button
                                                            key={action.label}
                                                            className={`btn btn--sm${action.danger ? " btn--danger" : " btn--ghost"}`}
                                                            onClick={() => action.onClick(row)}
                                                            aria-label={`${action.label} row ${id}`}
                                                            title={action.label}
                                                        >
                                                            {action.icon ?? action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Pagination ── */}
            {!loading && sorted.length > pageSize && (
                <div className="table-footer">
                    <div className="table-footer__info">
                        Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
                    </div>
                    <div className="table-pagination" role="navigation" aria-label="Pagination">
                        <button
                            className="table-page-btn"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                            aria-label="Previous page"
                        >
                            <ChevLeft />
                        </button>

                        {pageNums.map((n, i) =>
                            n === "…" ? (
                                <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "var(--t-tertiary)", fontSize: 12 }}>…</span>
                            ) : (
                                <button
                                    key={n}
                                    className={`table-page-btn${n === safePage ? " active" : ""}`}
                                    onClick={() => setPage(n)}
                                    aria-label={`Page ${n}`}
                                    aria-current={n === safePage ? "page" : undefined}
                                >
                                    {n}
                                </button>
                            )
                        )}

                        <button
                            className="table-page-btn"
                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                            disabled={safePage === pageCount}
                            aria-label="Next page"
                        >
                            <ChevRight />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(DataTable);