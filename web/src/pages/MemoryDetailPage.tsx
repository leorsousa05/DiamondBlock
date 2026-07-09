import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';
import type { Memory, MemoryType } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ArrowLeft, Edit, Trash2, AlertCircle } from 'lucide-react';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getMemory(id)
      .then((data) => {
        setMemory(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await api.deleteMemory(id);
      navigate('/memories');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setShowDelete(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <div className="loading-text">Loading memory details…</div>;

  if (error) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/memories')}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="alert alert-error" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!memory) return null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate('/memories')}
        >
          <ArrowLeft size={14} /> Back to Memories
        </button>
      </div>

      <div className="page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StatusBadge variant={memory.type as MemoryType} />
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{memory.scope}</span>
          </div>
          <h1 style={{ wordBreak: 'break-word', margin: 0 }}>{memory.title}</h1>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate(`/memories/${memory.id}/edit`)}
          >
            <Edit size={14} /> Edit
          </button>
          <button
            className="btn btn-danger btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Meta information */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="meta-row">
            <span className="meta-key">ID</span>
            <span className="meta-value monospace" style={{ fontSize: 12 }}>{memory.id}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Confidence</span>
            <span className="meta-value">{(memory.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Source</span>
            <span className="meta-value monospace" style={{ fontSize: 12 }}>{memory.source || '—'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Tags</span>
            <span className="meta-value">
              {memory.tags?.length
                ? memory.tags.map((tag) => (
                    <span key={tag} className="badge badge-info" style={{ marginRight: 4 }}>
                      {tag}
                    </span>
                  ))
                : '—'}
            </span>
          </div>
          {memory.entities?.length ? (
            <div className="meta-row">
              <span className="meta-key">Entities</span>
              <span className="meta-value" style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                {memory.entities.join(', ')}
              </span>
            </div>
          ) : null}
          <div className="meta-row">
            <span className="meta-key">Created</span>
            <span className="meta-value" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(memory.createdAt)}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Updated</span>
            <span className="meta-value" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDate(memory.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {memory.summary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Summary</h3>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 13, lineHeight: 1.5 }}>{memory.summary}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Content</h3>
        </div>
        <div
          className="card-body"
          style={{
            lineHeight: 1.75,
            color: 'var(--color-text-primary)',
          }}
        >
          <ReactMarkdown>{memory.content}</ReactMarkdown>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Memory"
          message={
            <>
              Are you sure you want to delete <strong>"{memory.title}"</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
