/**
 * features/admin/campaigns/CampaignListPage.jsx
 *
 * Admin page — manage all campaigns in the Campaign Experience System.
 *
 * Follows VideoShowcaseListPage architecture exactly:
 *   – local array as source of truth
 *   – individual create / edit / delete / toggle operations
 *   – DataTable + PageHeader + ConfirmDialog + CampaignFormModal
 *
 * Key difference from showcase: campaigns support individual CRUD (not replace-all),
 * so each operation hits its own endpoint and returns the mutated campaign.
 */
import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Button from '@/components/ui/Button.jsx';
import CampaignFormModal from './CampaignFormModal.jsx';
import {
  CAMPAIGN_TYPES,
  createCampaign,
  deleteCampaign,
  listCampaigns,
  toggleCampaign,
  updateCampaign,
} from './campaignService.js';
import styles from './CampaignListPage.module.css';

/** Map type value → label for the table cell. */
const typeLabel = (value) =>
  CAMPAIGN_TYPES.find((t) => t.value === value)?.label ?? value;

/** ISO date → short human-readable. */
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function CampaignListPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [notice, setNotice]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null); // null = create
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listCampaigns());
    } catch (err) {
      setError(err?.message ?? 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // ── CRUD ──────────────────────────────────────────────────────────────

  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);
    try {
      if (data._id) {
        const updated = await updateCampaign(data._id, data);
        setRows((rs) => rs.map((r) => (r._id === data._id ? updated : r)));
        showNotice(`Campaign updated: ${updated.name}`);
      } else {
        const created = await createCampaign(data);
        setRows((rs) => [...rs, created]);
        showNotice(`Campaign created: ${created.name}`);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (row) => {
    setSaving(true);
    try {
      const updated = await toggleCampaign(row._id, !row.enabled);
      setRows((rs) => rs.map((r) => (r._id === row._id ? updated : r)));
      showNotice(`"${row.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Toggle failed.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setSaving(true);
    try {
      await deleteCampaign(toDelete._id);
      setRows((rs) => rs.filter((r) => r._id !== toDelete._id));
      showNotice(`Deleted "${toDelete.name}".`);
      setToDelete(null);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Delete failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────

  const columns = [
    {
      key: 'status',
      header: 'Status',
      width: 90,
      render: (row) => {
        const now = Date.now();
        const started  = !row.startDate || new Date(row.startDate) <= now;
        const notEnded = !row.endDate   || new Date(row.endDate)   >  now;
        const live = row.enabled && started && notEnded;
        return (
          <span className={`${styles.statusBadge} ${live ? styles.statusLive : styles.statusOff}`}>
            {live ? 'Live' : row.enabled ? 'Scheduled' : 'Off'}
          </span>
        );
      },
    },
    {
      key: 'name',
      header: 'Campaign',
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.name}>{row.name || '—'}</span>
          <span className={styles.typeTag}>{typeLabel(row.type)}</span>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Headline',
      render: (row) => (
        <span className={styles.headline}>{row.title || <em className={styles.muted}>No headline</em>}</span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      width: 80,
      align: 'center',
      render: (row) => <span className={styles.priority}>{row.priority ?? 0}</span>,
    },
    {
      key: 'schedule',
      header: 'Schedule',
      width: 160,
      render: (row) => (
        <div className={styles.schedule}>
          <span>{fmtDate(row.startDate)} →</span>
          <span>{fmtDate(row.endDate)}</span>
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
            title={row.enabled ? 'Disable campaign' : 'Enable campaign'}
            aria-label={`${row.enabled ? 'Disable' : 'Enable'} ${row.name}`}
            disabled={saving}
            onClick={() => onToggle(row)}
          >
            <Power size={15} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            title="Edit"
            aria-label={`Edit ${row.name}`}
            onClick={() => { setEditing(row); setFormOpen(true); }}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            title="Delete"
            aria-label={`Delete ${row.name}`}
            disabled={saving}
            onClick={() => setToDelete(row)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  const activeLive = rows.filter((r) => {
    const now = Date.now();
    return r.enabled &&
      (!r.startDate || new Date(r.startDate) <= now) &&
      (!r.endDate   || new Date(r.endDate)   >  now);
  }).length;

  return (
    <div>
      <PageHeader
        title="Campaigns"
        subtitle={
          rows.length
            ? `${rows.length} campaign${rows.length === 1 ? '' : 's'} · ${activeLive} live`
            : 'No campaigns yet — create one to launch your first Campaign Experience.'
        }
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={saving}>
            <Plus size={18} /> New Campaign
          </Button>
        }
      />

      {/* Info card when nothing is live */}
      {!loading && rows.length === 0 && (
        <div className={styles.emptyHero}>
          <Megaphone size={36} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No campaigns yet</p>
          <p className={styles.emptyDesc}>
            Create a campaign and enable it — it will appear on the homepage after the configured delay.
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
          <button type="button" className={styles.retry} onClick={load}>Retry</button>
        </div>
      )}

      {rows.length > 0 && (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row._id}
          loading={loading}
          skeletonRows={4}
          empty="No campaigns found."
        />
      )}

      <CampaignFormModal
        open={formOpen}
        campaign={editing}
        saving={saving}
        onClose={() => !saving && setFormOpen(false)}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        danger
        title="Delete campaign?"
        message={
          toDelete
            ? `"${toDelete.name}" will be permanently removed. This cannot be undone.`
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
