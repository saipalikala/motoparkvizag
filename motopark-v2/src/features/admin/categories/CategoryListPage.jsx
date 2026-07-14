import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cloudinaryUrl } from '@/lib/image.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import CategoryFormModal from './CategoryFormModal.jsx';
import { deleteCategory, listCategories } from './categoryService.js';
import styles from './CategoryListPage.module.css';

export default function CategoryListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCategories());
    } catch (err) {
      setError(err?.message ?? 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const onSaved = (message) => {
    setFormOpen(false);
    setEditing(null);
    setNotice(message);
    load();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(toDelete.id);
      setNotice(`Deleted “${toDelete.name}”.`);
      setToDelete(null);
      load();
    } catch (err) {
      setNotice(err?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
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
            width={44}
            height={44}
            loading="lazy"
          />
        ) : (
          <div className={styles.thumbEmpty} aria-hidden="true" />
        ),
    },
    { key: 'name', header: 'Name', render: (row) => <span className={styles.name}>{row.name}</span> },
    { key: 'slug', header: 'Slug', render: (row) => <code className={styles.slug}>{row.slug}</code> },
    {
      key: 'description',
      header: 'Description',
      render: (row) =>
        row.description ? (
          <span className={styles.desc}>{row.description}</span>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: 120,
      render: (row) => (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            title="Edit"
            aria-label={`Edit ${row.name}`}
            onClick={() => openEdit(row)}
          >
            <Pencil size={16} />
          </button>
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
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={rows.length ? `${rows.length} categories` : 'Manage the storefront category taxonomy'}
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} /> Create Category
          </Button>
        }
      />

      {notice && (
        <div className={styles.notice} role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      {error ? (
        <div className={styles.errorBox} role="alert">
          {error}{' '}
          <button type="button" className={styles.retry} onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          skeletonRows={6}
          empty="No categories yet. Create your first category to get started."
        />
      )}

      <CategoryFormModal
        open={formOpen}
        category={editing}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete category?"
        message={
          toDelete
            ? `“${toDelete.name}” will be removed. Products keep their category id but the taxonomy entry is gone. This cannot be undone.`
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
