import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import {
  listProducts,
  deleteProduct,
  getCategoryOptions,
} from './productService.js';
import styles from './ProductListPage.module.css';

const PAGE_SIZE = 20;

export default function ProductListPage() {
  const location = useLocation();
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // committed search term
  const [catMap, setCatMap] = useState({});
  const [toDelete, setToDelete] = useState(null); // row pending deletion
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listProducts({ page, limit: PAGE_SIZE, search: query || undefined });
      setData(res);
    } catch (err) {
      setError(err?.message ?? 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Flash message handed over from the form after create/update.
  useEffect(() => {
    if (location.state?.flash) {
      setNotice(location.state.flash);
      // Clear history state so a refresh/back doesn't re-show it.
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Category id → name (products store category as an id string).
  useEffect(() => {
    let alive = true;
    getCategoryOptions()
      .then((opts) => {
        if (!alive) return;
        setCatMap(Object.fromEntries(opts.map((o) => [o.value, o.label])));
      })
      .catch(() => {
        /* non-fatal — fall back to showing the raw id */
      });
    return () => {
      alive = false;
    };
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(toDelete.id);
      setNotice(`Deleted “${toDelete.name}”.`);
      setToDelete(null);
      // If we removed the last row on a page, step back a page.
      if (data.rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      setNotice(err?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'image',
        header: 'Image',
        width: 72,
        render: (row) =>
          row.image ? (
            <img
              className={styles.thumb}
              src={cloudinaryUrl(row.image, { w: 96 })}
              alt=""
              width={48}
              height={48}
              loading="lazy"
            />
          ) : (
            <div className={styles.thumbEmpty} aria-hidden="true" />
          ),
      },
      {
        key: 'name',
        header: 'Name',
        render: (row) => (
          <Link className={styles.nameLink} to={`/admin/products/${row.id}`}>
            {row.name}
          </Link>
        ),
      },
      { key: 'brand', header: 'Brand', render: (row) => <span className={styles.brand}>{row.brand}</span> },
      {
        key: 'category',
        header: 'Category',
        render: (row) => catMap[row.categoryId] ?? <span className={styles.muted}>—</span>,
      },
      {
        key: 'price',
        header: 'Price',
        align: 'right',
        render: (row) => <span className={styles.price}>{formatINR(row.priceINR)}</span>,
      },
      {
        key: 'stock',
        header: 'Stock',
        render: (row) => (
          <span className={`${styles.badge} ${row.inStock ? styles.inStock : styles.outStock}`}>
            {row.inStock ? `In stock · ${row.stockUnits}` : 'Out of stock'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        width: 120,
        render: (row) => (
          <div className={styles.actions}>
            <Link
              to={`/admin/products/${row.id}`}
              className={styles.iconBtn}
              title="Edit"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil size={16} />
            </Link>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              title="Delete"
              aria-label={`Delete ${row.name}`}
              onClick={() => setToDelete(row)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
    [catMap],
  );

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={
          data.total
            ? `${data.total} product${data.total === 1 ? '' : 's'} in the catalog`
            : 'Manage your product catalog'
        }
        actions={
          <>
            <form className={styles.searchForm} onSubmit={onSearchSubmit} role="search">
              <Search size={16} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
            </form>
            <Button as={Link} to="/admin/products/new">
              <Plus size={18} /> Create Product
            </Button>
          </>
        }
      />

      {notice && (
        <div className={styles.notice} role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

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
          skeletonRows={PAGE_SIZE > 8 ? 8 : PAGE_SIZE}
          empty={
            query
              ? `No products match “${query}”.`
              : 'No products yet. Create your first product to get started.'
          }
        />
      )}

      {data.pages > 1 && (
        <div className={styles.pager}>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {data.page} of {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete product?"
        message={
          toDelete
            ? `“${toDelete.name}” will be permanently removed from the catalog. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}
