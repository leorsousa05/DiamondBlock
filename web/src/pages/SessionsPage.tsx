import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Session } from '../api/client';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { History, AlertCircle } from 'lucide-react';

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

function truncate(str: string, n = 20): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState('');
  const [limit, setLimit] = useState(20);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    api
      .listSessions({ project: project || undefined, limit })
      .then(setSessions)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [project, limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const columns = [
    {
      header: 'ID',
      key: 'id',
      width: '200px',
      render: (row: Session) => (
        <span className="monospace" style={{ fontSize: 12 }}>{truncate(row.id, 24)}</span>
      ),
    },
    {
      header: 'Project',
      key: 'projectId',
      render: (row: Session) => (
        <span style={{ color: 'var(--color-text-secondary)' }}>{row.projectId || '—'}</span>
      ),
    },
    {
      header: 'Created',
      key: 'createdAt',
      width: '130px',
      render: (row: Session) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Processed',
      key: 'processed',
      width: '100px',
      render: (row: Session) => (
        <StatusBadge
          variant={row.processed ? 'success' : 'warning'}
          label={row.processed ? 'Yes' : 'No'}
        />
      ),
    },
    {
      header: 'Messages',
      key: 'messageCount',
      width: '90px',
      render: (row: Session) => (
        <span style={{ fontWeight: 500 }}>{row.messageCount}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <History size={24} style={{ color: 'var(--color-accent)' }} /> Sessions
        </h1>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Project</label>
          <input
            className="form-input"
            placeholder="Filter by project…"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Limit</label>
          <select
            className="form-select"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={sessions}
        loading={loading}
        onRowClick={(row) => navigate(`/sessions/${row.id}`)}
        emptyMessage="No sessions found."
      />
    </div>
  );
}
