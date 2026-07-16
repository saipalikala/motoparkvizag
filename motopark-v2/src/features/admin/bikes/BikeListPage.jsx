import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import BikeFormModal from './BikeFormModal.jsx';
import { deleteBike, listBikes } from './bikeService.js';
import styles from './BikeListPage.module.css';

/**
 * BikeListPage — "Shop by Bike" fitment management (Milestone 8). Backend sorts
 * by make then model, so the table reads as makes grouped together. Reuses the
 * shared DataTable, ConfirmDialog, and modal-form primitives.
 */
export default function BikeListPage() {
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
      setRows(await listBikes());
    } catch (err) {
      setError(err?.message ?? 'Failed to load bikes.');
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
      await deleteBike(toDelete.id);
      setNotice(`Deleted “${toDelete.make} ${toDelete.model}”.`);
      setToDelete(null);
      load();
    } catch (err) {
      setNotice(err?.message ?? 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'make', header: 'Make', render: (row) => <span className={styles.make}>{row.make}</span> },
    { key: 'model', header: 'Model', render: (row) => <span className={styles.model}>{row.model}</span> },
    {
      key: 'url',
      header: 'URL',
      render: (row) => <code className={styles.slug}>/bikes/{row.makeSlug}/{row.slug}</code>,
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
            aria-label={`Edit ${row.make} ${row.model}`}
            onClick={() => openEdit(row)}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            title="Delete"
            aria-label={`Delete ${row.make} ${row.model}`}
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
        title="Bikes"
        subtitle={
          rows.length
            ? `${rows.length} model${rows.length === 1 ? '' : 's'} across the fitment catalog`
            : 'Manage motorcycles for the “Shop by Bike” menu'
        }
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} /> Add Bike
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
          empty="No bikes yet. Add your first make and model to power the Shop by Bike menu."
        />
      )}

      <BikeFormModal open={formOpen} bike={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete bike?"
        message={
          toDelete
            ? `“${toDelete.make} ${toDelete.model}” will be removed from the Shop by Bike menu. Products keep their compatibleBikes ids but this fitment entry is gone. This cannot be undone.`
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
