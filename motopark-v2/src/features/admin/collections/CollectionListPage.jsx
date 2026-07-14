import { useCallback, useEffect, useState } from 'react';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import CollectionFormModal from './CollectionFormModal.jsx';
import { deleteCollection, listCollections } from './collectionService.js';
import styles from './CollectionListPage.module.css';

export default function CollectionListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCollections());
    } catch (err) {
      setError(err?.message ?? 'Failed to load collections.');
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
      await deleteCollection(toDelete.id);
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
    { key: 'name', header: 'Name', render: (row) => <span className={styles.name}>{row.name}</span> },
    { key: 'slug', header: 'Slug', render: (row) => <code className={styles.slug}>{row.slug}</code> },
    {
      key: 'products',
      header: 'Products',
      render: (row) => (
        <span className={styles.countBadge}>
          <Layers size={14} /> {row.productCount}
        </span>
      ),
    },
    {
      key: 'preview',
      header: 'Includes',
      render: (row) =>
        row.products.length ? (
          <span className={styles.preview}>
            {row.products.slice(0, 2).map((p) => p.name).join(', ')}
            {row.products.length > 2 ? ` +${row.products.length - 2} more` : ''}
          </span>
        ) : (
          <span className={styles.muted}>Empty</span>
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
        title="Collections"
        subtitle={rows.length ? `${rows.length} curated collections` : 'Group products into curated collections'}
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} /> Create Collection
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
          skeletonRows={5}
          empty="No collections yet. Create one to group products together."
        />
      )}

      <CollectionFormModal
        open={formOpen}
        collection={editing}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete collection?"
        message={
          toDelete
            ? `“${toDelete.name}” will be removed. The products themselves are not deleted. This cannot be undone.`
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
