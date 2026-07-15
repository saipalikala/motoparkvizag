import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import { listCustomers } from './customerService.js';
import styles from './CustomerListPage.module.css';

const PAGE_SIZE = 20;

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function CustomerListPage() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listCustomers({ page, limit: PAGE_SIZE, search: query || undefined }));
    } catch (err) {
      setError(err?.message ?? 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row) => (
          <Link className={styles.nameLink} to={`/admin/customers/${row.id}`}>
            {row.name}
          </Link>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (row) => (row.email ? <span className={styles.email}>{row.email}</span> : <span className={styles.muted}>—</span>),
      },
      {
        key: 'phone',
        header: 'Phone',
        render: (row) => (row.phone ? <span className={styles.phone}>{row.phone}</span> : <span className={styles.muted}>—</span>),
      },
      {
        key: 'verified',
        header: 'Verified',
        render: (row) =>
          row.verified ? (
            <span className={styles.verified}>
              <BadgeCheck size={14} /> Verified
            </span>
          ) : (
            <span className={styles.unverified}>Unverified</span>
          ),
      },
      { key: 'joined', header: 'Joined', render: (row) => <span className={styles.muted}>{fmtDate(row.createdAt)}</span> },
      {
        key: 'actions',
        header: '',
        align: 'right',
        width: 100,
        render: (row) => (
          <Link to={`/admin/customers/${row.id}`} className={styles.view}>
            View <ArrowRight size={14} />
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={data.total ? `${data.total} registered customer${data.total === 1 ? '' : 's'}` : 'Registered customer accounts'}
        actions={
          <form className={styles.searchForm} onSubmit={onSearchSubmit} role="search">
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
          </form>
        }
      />

      {error ? (
        <div className={styles.error} role="alert">
          {error}{' '}
          <button type="button" className={styles.retry} onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowKey={(row) => row.id}
          loading={loading}
          skeletonRows={8}
          empty={query ? `No customers match “${query}”.` : 'No customers yet.'}
        />
      )}

      {data.pages > 1 && (
        <div className={styles.pager}>
          <button type="button" className={styles.pageBtn} disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <span className={styles.pageInfo}>Page {data.page} of {data.pages}</span>
          <button type="button" className={styles.pageBtn} disabled={loading || page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
