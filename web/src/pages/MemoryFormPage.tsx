import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { MemoryType, CreateMemoryBody, UpdateMemoryBody } from '../api/client';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const MEMORY_TYPES: MemoryType[] = ['user', 'project', 'knowledge', 'distilled'];

interface FormState {
  title: string;
  type: MemoryType;
  scope: string;
  projectId: string;
  tags: string;
  confidence: number;
  content: string;
  source: string;
}

const DEFAULT_FORM: FormState = {
  title: '',
  type: 'knowledge',
  scope: '',
  projectId: '',
  tags: '',
  confidence: 1,
  content: '',
  source: '',
};

export default function MemoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    api
      .getMemory(id)
      .then((data) => {
        setForm({
          title: data.title,
          type: data.type,
          scope: data.scope,
          projectId: '',
          tags: (data.tags ?? []).join(', '),
          confidence: data.confidence,
          content: data.content,
          source: data.source ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update(field: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isEdit && id) {
        const body: UpdateMemoryBody = {
          title: form.title,
          content: form.content,
          tags,
          confidence: form.confidence,
          scope: form.scope || undefined,
        };
        const updated = await api.updateMemory(id, body);
        navigate(`/memories/${updated.id}`);
      } else {
        const body: CreateMemoryBody = {
          type: form.type,
          scope: form.scope,
          title: form.title,
          content: form.content,
          tags,
          confidence: form.confidence,
          source: form.source || undefined,
          projectId: form.projectId || undefined,
        };
        const created = await api.createMemory(body);
        navigate(`/memories/${created.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="loading-text">Loading form…</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => navigate(isEdit && id ? `/memories/${id}` : '/memories')}
        >
          <ArrowLeft size={14} /> Cancel
        </button>
      </div>

      <h1 style={{ marginBottom: 24 }}>{isEdit ? 'Edit Memory' : 'New Memory'}</h1>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">
                Title *
              </label>
              <input
                id="title"
                className="form-input"
                placeholder="Memory title"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="type">
                  Type
                </label>
                <select
                  id="type"
                  className="form-select"
                  value={form.type}
                  onChange={(e) => update('type', e.target.value as MemoryType)}
                  disabled={isEdit}
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="scope">
                  Scope
                </label>
                <input
                  id="scope"
                  className="form-input"
                  placeholder="e.g. global or project-name"
                  value={form.scope}
                  onChange={(e) => update('scope', e.target.value)}
                />
              </div>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label className="form-label" htmlFor="projectId">
                  Project ID (optional)
                </label>
                <input
                  id="projectId"
                  className="form-input"
                  placeholder="Project identifier"
                  value={form.projectId}
                  onChange={(e) => update('projectId', e.target.value)}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="tags">
                  Tags (comma-separated)
                </label>
                <input
                  id="tags"
                  className="form-input"
                  placeholder="tag1, tag2, tag3"
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confidence">
                  Confidence
                </label>
                <input
                  id="confidence"
                  type="number"
                  className="form-input"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.confidence}
                  onChange={(e) => update('confidence', Number(e.target.value))}
                  style={{ width: 100 }}
                />
              </div>
            </div>

            {!isEdit && (
              <div className="form-group">
                <label className="form-label" htmlFor="source">
                  Source (optional)
                </label>
                <input
                  id="source"
                  className="form-input"
                  placeholder="Source reference"
                  value={form.source}
                  onChange={(e) => update('source', e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="content">
                Content * (Markdown supported)
              </label>
              <textarea
                id="content"
                className="form-textarea"
                placeholder="Memory content…"
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                style={{ minHeight: 260, fontFamily: 'monospace', fontSize: 13 }}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(isEdit && id ? `/memories/${id}` : '/memories')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={submitting}>
            <Save size={16} /> {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Memory'}
          </button>
        </div>
      </form>
    </div>
  );
}
