import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Session, SessionMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, AlertCircle, MessageSquare } from 'lucide-react';

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

function looksLikeCode(text: string): boolean {
  const codeIndicators = ['```', '    ', '\t', 'function ', 'class ', 'import ', 'const ', 'def ', '=>'];
  return codeIndicators.some((indicator) => text.includes(indicator));
}

function MessageBubble({ msg }: { msg: SessionMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-message ${msg.role}`}>
      <div className="chat-role-label" style={{ textAlign: isUser ? 'right' : 'left' }}>
        {isUser ? 'User' : 'Assistant'}
      </div>
      {looksLikeCode(msg.content) ? (
        <pre
          className="chat-bubble"
          style={{
            backgroundColor: isUser ? 'var(--color-accent-light)' : 'var(--color-bg)',
            border: `1px solid ${isUser ? 'rgba(34,139,230,0.2)' : 'var(--color-border)'}`,
            borderRadius: 10,
            fontSize: 12.5,
            overflow: 'auto',
          }}
        >
          {msg.content}
        </pre>
      ) : (
        <div className="chat-bubble">{msg.content}</div>
      )}
    </div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getSession(id)
      .then((data) => {
        setSession(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-text">Loading session details…</div>;

  if (error) {
    return (
      <div>
        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/sessions')}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="alert alert-error" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/sessions')}>
          <ArrowLeft size={14} /> Back to Sessions
        </button>
      </div>

      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageSquare size={24} style={{ color: 'var(--color-accent)' }} /> Session Details
        </h1>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="meta-row">
            <span className="meta-key">ID</span>
            <span className="meta-value monospace" style={{ fontSize: 12 }}>{session.id}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Project</span>
            <span className="meta-value">{session.projectId || '—'}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Created</span>
            <span className="meta-value">{formatDate(session.createdAt)}</span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Processed</span>
            <span className="meta-value">
              <StatusBadge
                variant={session.processed ? 'success' : 'warning'}
                label={session.processed ? 'Yes' : 'No'}
              />
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-key">Messages</span>
            <span className="meta-value" style={{ fontWeight: 500 }}>
              {session.messageCount}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Messages</h3>
        </div>
        <div className="card-body">
          {session.messages && session.messages.length > 0 ? (
            <div className="chat-messages">
              {session.messages.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No messages available for this session.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
