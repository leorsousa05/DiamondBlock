import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Memory, MemoryType } from '../api/client';
import { DataTable } from '../components/DataTable';
import { SearchBar } from '../components/SearchBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { Brain, Trash2, Plus, AlertCircle, Check, X } from 'lucide-react';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function MemoriesPage() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('');
  const [limit, setLimit] = useState(20);
  const [filterType, setFilterType] = useState<string>('');
  const [filterTag, setFilterTag] = useState('');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');

  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const [purgeScope, setPurgeScope] = useState('');
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const fetchMemories = useCallback(() => {
    setLoading(true);
    setError(null);
    const req = query
      ? api.searchMemories(query, { scope: scope || undefined, limit, type: (filterType as MemoryType) || undefined })
      : api.listMemories({ scope: scope || undefined, limit, type: (filterType as MemoryType) || undefined });

    req
      .then((data) => {
        let filtered = data;

        // Apply client-side tag filtering if requested
        if (filterTag.trim()) {
          const searchTag = filterTag.trim().toLowerCase();
          filtered = filtered.filter((m) =>
            m.tags?.some((t) => t.toLowerCase().includes(searchTag))
          );
        }

        // Apply client-side confidence filtering if requested
        if (filterConfidence !== 'all') {
          const minConf = parseFloat(filterConfidence);
          filtered = filtered.filter((m) => m.confidence >= minConf);
        }

        setMemories(filtered);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query, scope, limit, filterType, filterTag, filterConfidence]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteMemory(deleteTarget.id);
      setDeleteTarget(null);
      fetchMemories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handlePurge() {
    setPurgeLoading(true);
    try {
      const res = await api.purgeMemories({ scope: purgeScope || undefined });
      setPurgeResult(`Deleted ${res.deleted} memories`);
      setShowPurge(false);
      setPurgeScope('');
      fetchMemories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setPurgeLoading(false);
    }
  }

  const columns = [
    {
      header: 'Title',
      key: 'title',
      render: (row: Memory) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.title}</span>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      width: '110px',
      render: (row: Memory) => <StatusBadge variant={row.type as MemoryType} />,
    },
    {
      header: 'Scope',
      key: 'scope',
      width: '140px',
    },
    ...(query.trim() ? [{
      header: 'Match',
      key: 'score',
      width: '80px',
      render: (row: Memory) => (
        <span className="badge badge-success" style={{ fontWeight: 600, fontSize: 11 }}>
          {typeof row.score === 'number' ? `${(row.score * 100).toFixed(0)}%` : '—'}
        </span>
      ),
    }] : []),
    {
      header: 'Tags',
      key: 'tags',
      render: (row: Memory) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {row.tags?.join(', ') || '—'}
        </span>
      ),
    },
    {
      header: 'Confidence',
      key: 'confidence',
      width: '90px',
      render: (row: Memory) => (
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          {(row.confidence * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      width: '120px',
      render: (row: Memory) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {formatDate(row.updatedAt)}
        </span>
      ),
    },
    {
      header: '',
      key: '_actions',
      width: '60px',
      render: (row: Memory) => (
        <button
          className="btn btn-danger btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(row);
          }}
          style={{ display: 'flex', alignItems: 'center', justifySelf: 'center' }}
        >
          <Trash2 size={12} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={24} style={{ color: 'var(--color-accent)' }} /> Memories
        </h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowPurge(true)}>
            <Trash2 size={14} /> Purge
          </button>
          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/memories/new')}>
            <Plus size={14} /> New Memory
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {purgeResult && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} /> {purgeResult}
        </div>
      )}

      {/* SLA / Filter Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Main search and Limit */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 3, minWidth: 240 }}>
              <SearchBar placeholder="Search memories semantically via embeddings…" onChange={setQuery} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
              <select
                className="form-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={{ height: '36px' }}
              >
                <option value={10}>Show 10</option>
                <option value={20}>Show 20</option>
                <option value={50}>Show 50</option>
                <option value={100}>Show 100</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Scope</label>
              <input
                className="form-input"
                placeholder="Filter by scope…"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Type</label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13, height: '32px' }}
              >
                <option value="">All Types</option>
                <option value="user">User</option>
                <option value="project">Project</option>
                <option value="knowledge">Knowledge</option>
                <option value="distilled">Distilled</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Tag</label>
              <input
                className="form-input"
                placeholder="Filter by tag…"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Confidence</label>
              <select
                className="form-select"
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 13, height: '32px' }}
              >
                <option value="all">Any Confidence</option>
                <option value="0.5">&ge; 50%</option>
                <option value="0.8">&ge; 80%</option>
                <option value="1.0">100%</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={memories}
        loading={loading}
        onRowClick={(row) => navigate(`/memories/${row.id}`)}
        emptyMessage="No memories match your query and filter criteria."
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Memory"
          message={
            <>
              Are you sure you want to delete{' '}
              <strong>"{deleteTarget.title}"</strong>? This action cannot be undone.
            </>
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {showPurge && (
        <div className="modal-overlay" onClick={() => setShowPurge(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} style={{ color: 'var(--color-danger)' }} /> Purge Memories
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                onClick={() => setShowPurge(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Permanently delete memories matching the scope. Leave blank to purge all.
            </p>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Scope (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. my-project"
                value={purgeScope}
                onChange={(e) => setPurgeScope(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPurge(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handlePurge} disabled={purgeLoading}>
                {purgeLoading ? 'Purging…' : 'Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
