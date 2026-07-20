/**
 * features/admin/hero-carousel/HeroCarouselListPage.jsx
 *
 * Admin page — manage every slide in the homepage Hero Carousel.
 *
 * Follows CampaignListPage's architecture: local array as source of truth,
 * individual create/edit/delete/toggle operations each hitting their own
 * endpoint and returning the mutated document (not a replace-all pattern).
 *
 * Two things Campaigns doesn't have, both explained where they're used below:
 *   - a status filter (All/Live/Scheduled/Off) — worth it here because a
 *     seasonal slide archive accumulates far more "Off" rows than Campaigns
 *     ever does with its single-winner model
 *   - inline ▲/▼ reordering — the Phase-1-approved API has no bulk-reorder
 *     endpoint yet, so this edits `order` one slide at a time via the
 *     standard PUT, renumbering to sparse steps so it self-heals ties
 *     (every new slide defaults to order 0)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  GalleryHorizontal,
  Image as ImageIcon,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import {
  deleteHeroSlide,
  listHeroSlides,
  toggleHeroSlide,
  updateHeroSlide,
} from './heroCarouselService.js';
import styles from './HeroCarouselListPage.module.css';

const ORDER_STEP = 10;
const STATUS_FILTERS = ['all', 'live', 'scheduled', 'off'];
const STATUS_LABEL = { all: 'All', live: 'Live', scheduled: 'Scheduled', off: 'Off' };

/** enabled + publishAt/expireAt window → 'live' | 'scheduled' | 'off'. Same
 *  three-state logic CampaignListPage uses, field names adjusted. */
function slideStatus(row) {
  if (!row.enabled) return 'off';
  const now = Date.now();
  const started = !row.publishAt || new Date(row.publishAt) <= now;
  const notEnded = !row.expireAt || new Date(row.expireAt) > now;
  return started && notEnded ? 'live' : 'scheduled';
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function HeroCarouselListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toDelete, setToDelete] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listHeroSlides());
    } catch (err) {
      setError(err?.message ?? 'Failed to load hero slides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Flash message after a create/edit redirect from HeroCarouselFormPage.
  useEffect(() => {
    if (location.state?.flash) {
      showNotice(location.state.flash);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // ── Sequence — always the full set sorted by order, independent of the
  // status filter, so reorder math never depends on which pill is active. ──
  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(a.createdAt) - new Date(b.createdAt),
      ),
    [rows],
  );

  const visibleRows = useMemo(
    () => (filter === 'all' ? sortedRows : sortedRows.filter((r) => slideStatus(r) === filter)),
    [sortedRows, filter],
  );

  // ── CRUD ──────────────────────────────────────────────────────────────

  const onToggle = async (row) => {
    setSaving(true);
    try {
      const updated = await toggleHeroSlide(row._id, !row.enabled);
      setRows((rs) => rs.map((r) => (r._id === row._id ? updated : r)));
      showNotice(`"${row.internalTitle}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err?.message ?? 'Toggle failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      await deleteHeroSlide(toDelete._id);
      setRows((rs) => rs.filter((r) => r._id !== toDelete._id));
      showNotice(`Deleted "${toDelete.internalTitle}".`);
      setToDelete(null);
    } catch (err) {
      setError(err?.message ?? 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reorder — renumbers only the rows whose sparse-step position actually
  // changes, so a swap between two ties (both default to order 0) still
  // produces a real, distinct result instead of a silent no-op. ──
  const persistReorder = async (sequence) => {
    setSaving(true);
    setError(null);
    try {
      const updates = [];
      sequence.forEach((row, i) => {
        const desired = (i + 1) * ORDER_STEP;
        if (row.order !== desired) updates.push(updateHeroSlide(row._id, { order: desired }));
      });
      const updated = await Promise.all(updates);
      setRows((rs) => {
        const byId = new Map(rs.map((r) => [r._id, r]));
        for (const u of updated) byId.set(u._id, u);
        return [...byId.values()];
      });
    } catch (err) {
      setError(err?.message ?? 'Reorder failed.');
    } finally {
      setSaving(false);
    }
  };

  const moveUp = (row) => {
    const idx = sortedRows.findIndex((r) => r._id === row._id);
    if (idx <= 0) return;
    const next = [...sortedRows];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    persistReorder(next);
  };

  const moveDown = (row) => {
    const idx = sortedRows.findIndex((r) => r._id === row._id);
    if (idx === -1 || idx >= sortedRows.length - 1) return;
    const next = [...sortedRows];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    persistReorder(next);
  };

  // ── Table columns ──────────────────────────────────────────────────────

  const columns = [
    {
      key: 'status',
      header: 'Status',
      width: 90,
      render: (row) => {
        const status = slideStatus(row);
        return (
          <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
            {STATUS_LABEL[status]}
          </span>
        );
      },
    },
    {
      key: 'thumb',
      header: 'Image',
      width: 64,
      render: (row) => (
        <div className={styles.thumb}>
          {row.desktopImage ? (
            <img src={row.desktopImage} alt="" loading="lazy" />
          ) : (
            <ImageIcon size={16} className={styles.thumbPlaceholder} aria-hidden="true" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Slide',
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.name}>{row.internalTitle || '—'}</span>
          <span className={styles.headline}>
            {row.headline || <em className={styles.muted}>No headline</em>}
          </span>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      width: 96,
      align: 'center',
      render: (row) => {
        const idx = sortedRows.findIndex((r) => r._id === row._id);
        const canReorder = filter === 'all';
        return (
          <div className={styles.orderCell}>
            <button
              type="button"
              className={styles.orderBtn}
              aria-label={`Move ${row.internalTitle} up`}
              disabled={!canReorder || saving || idx <= 0}
              onClick={() => moveUp(row)}
            >
              <ArrowUp size={13} />
            </button>
            <span className={styles.orderValue}>{row.order ?? 0}</span>
            <button
              type="button"
              className={styles.orderBtn}
              aria-label={`Move ${row.internalTitle} down`}
              disabled={!canReorder || saving || idx === -1 || idx >= sortedRows.length - 1}
              onClick={() => moveDown(row)}
            >
              <ArrowDown size={13} />
            </button>
          </div>
        );
      },
    },
    {
      key: 'schedule',
      header: 'Schedule',
      width: 160,
      render: (row) => (
        <div className={styles.schedule}>
          <span>{fmtDate(row.publishAt)} →</span>
          <span>{fmtDate(row.expireAt)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: 130,
      render: (row) => (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${row.enabled ? styles.iconBtnActive : ''}`}
            title={row.enabled ? 'Disable slide' : 'Enable slide'}
            aria-label={`${row.enabled ? 'Disable' : 'Enable'} ${row.internalTitle}`}
            disabled={saving}
            onClick={() => onToggle(row)}
          >
            <Power size={15} />
          </button>
          <Link
            to={`/admin/hero-carousel/${row._id}`}
            className={styles.iconBtn}
            title="Edit"
            aria-label={`Edit ${row.internalTitle}`}
          >
            <Pencil size={15} />
          </Link>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            title="Delete"
            aria-label={`Delete ${row.internalTitle}`}
            disabled={saving}
            onClick={() => setToDelete(row)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const liveCount = rows.filter((r) => slideStatus(r) === 'live').length;

  return (
    <div>
      <PageHeader
        title="Hero Carousel"
        subtitle={
          rows.length
            ? `${rows.length} slide${rows.length === 1 ? '' : 's'} · ${liveCount} live`
            : 'No slides yet — create one to build your homepage hero carousel.'
        }
        actions={
          <Button as={Link} to="/admin/hero-carousel/new" disabled={saving}>
            <Plus size={18} /> New Slide
          </Button>
        }
      />

      {rows.length > 0 && (
        <div className={styles.filterRow} role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.filterPill} ${filter === f ? styles.filterPillActive : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className={styles.emptyHero}>
          <GalleryHorizontal size={36} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No hero slides yet</p>
          <p className={styles.emptyDesc}>
            Create a slide and enable it — it will appear in the homepage hero carousel.
          </p>
        </div>
      )}

      {notice && (
        <div className={styles.notice} role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      {error && (
        <div className={styles.errorBox} role="alert">
          {error}{' '}
          <button type="button" className={styles.retry} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {(loading || visibleRows.length > 0 || rows.length > 0) && (
        <DataTable
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row._id}
          loading={loading}
          skeletonRows={4}
          empty="No slides match this filter."
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete hero slide?"
        message={
          toDelete
            ? `"${toDelete.internalTitle}" will be permanently removed. This cannot be undone.`
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
