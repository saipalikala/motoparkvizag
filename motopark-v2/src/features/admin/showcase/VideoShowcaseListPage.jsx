import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import VideoShowcaseFormModal from './VideoShowcaseFormModal.jsx';
import { listSlides, nextId, saveSlides } from './showcaseService.js';
import styles from './VideoShowcaseListPage.module.css';

/**
 * VideoShowcaseListPage — manage the homepage Cinematic Theater slides (M9).
 *
 * The backend endpoint is replace-all, so this page holds the whole slides array
 * as its source of truth: every Add/Edit/Delete mutates the array locally and
 * POSTs the entire list. There must always be ≥ 1 slide (empty POST is rejected),
 * so deleting the final slide is blocked.
 */
export default function VideoShowcaseListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listSlides());
    } catch (err) {
      setError(err?.message ?? 'Failed to load showcase slides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Persist a new array; on success adopt it, else surface the error and keep state.
  const persist = async (nextRows, successMsg) => {
    setSaving(true);
    setError(null);
    try {
      await saveSlides(nextRows);
      setRows(nextRows);
      setNotice(successMsg);
      return true;
    } catch (err) {
      setNotice(err?.message ?? 'Save failed.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setFormOpen(true);
  };

  const onSubmit = async (row) => {
    const isEdit = typeof row.id === 'number' && rows.some((r) => r.id === row.id);
    const nextRows = isEdit
      ? rows.map((r) => (r.id === row.id ? { ...r, ...row } : r))
      : [...rows, { ...row, id: nextId(rows) }];
    const ok = await persist(nextRows, `Slide ${isEdit ? 'updated' : 'added'}: ${row.title}`);
    if (ok) {
      setFormOpen(false);
      setEditing(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const nextRows = rows.filter((r) => r.id !== toDelete.id);
    const ok = await persist(nextRows, `Deleted “${toDelete.title}”.`);
    if (ok) setToDelete(null);
  };

  const columns = [
    {
      key: 'poster',
      header: 'Poster',
      width: 96,
      render: (row) =>
        row.poster ? (
          <img className={styles.thumb} src={row.poster} alt="" loading="lazy" />
        ) : (
          <div className={styles.thumbEmpty} aria-hidden="true" />
        ),
    },
    {
      key: 'title',
      header: 'Headline',
      render: (row) => (
        <div className={styles.headline}>
          <span className={styles.title}>{row.title || '—'}</span>
          {row.tag && <span className={styles.tag}>{row.tag}</span>}
        </div>
      ),
    },
    {
      key: 'buyNowLink',
      header: 'Buy link',
      render: (row) =>
        row.buyNowLink ? (
          <span className={styles.buy}>
            <ExternalLink size={13} aria-hidden="true" />
            <code>{row.buyNowLink}</code>
          </span>
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
            aria-label={`Edit ${row.title}`}
            onClick={() => openEdit(row)}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            title={rows.length <= 1 ? 'At least one slide is required' : 'Delete'}
            aria-label={`Delete ${row.title}`}
            disabled={rows.length <= 1 || saving}
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
        title="Video Showcase"
        subtitle={
          rows.length
            ? `${rows.length} slide${rows.length === 1 ? '' : 's'} in the homepage Cinematic Theater`
            : 'Manage the homepage Cinematic Theater slides'
        }
        actions={
          <Button onClick={openCreate} disabled={saving}>
            <Plus size={18} /> Add Slide
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
          skeletonRows={4}
          empty="No slides yet. Add one — until then the storefront shows the built-in demo reel."
        />
      )}

      <VideoShowcaseFormModal
        open={formOpen}
        slide={editing}
        saving={saving}
        onClose={() => !saving && setFormOpen(false)}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete slide?"
        message={
          toDelete
            ? `“${toDelete.title}” will be removed from the homepage Cinematic Theater. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        busy={saving}
        onConfirm={confirmDelete}
        onCancel={() => !saving && setToDelete(null)}
      />
    </div>
  );
}
