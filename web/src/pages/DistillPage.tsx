import React, { useState } from 'react';
import { api } from '../api/client';
import { ProgressBar } from '../components/ProgressBar';
import { Flame, AlertCircle, Check, Play, RotateCcw } from 'lucide-react';

export default function DistillPage() {
  const [limit, setLimit] = useState<number | ''>('');
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setOperationId(null);
    setSubmitting(true);

    try {
      const res = await api.startDistill({
        dryRun,
        limit: limit !== '' ? Number(limit) : undefined,
      });
      setOperationId(res.operationId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start distill');
    } finally {
      setSubmitting(false);
    }
  }

  function handleComplete(resultData: unknown) {
    const r = resultData as Record<string, unknown>;
    const processed = r?.processed ?? r?.count ?? '';
    const created = r?.memoriesCreated ?? r?.created ?? '';
    const parts = [];
    if (processed !== '') parts.push(`${processed} sessions processed`);
    if (created !== '') parts.push(`${created} memories created`);
    setResult(parts.length > 0 ? parts.join(', ') : 'Distillation complete.');
  }

  function handleReset() {
    setOperationId(null);
    setResult(null);
    setError(null);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flame size={24} style={{ color: 'var(--color-accent)' }} /> Distill
        </h1>
      </div>

      <p style={{ marginBottom: 24, color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Distill processes conversation sessions and extracts durable memories from them.
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} /> {result}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Run Distillation</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="distill-limit">
                Session Limit (optional)
              </label>
              <input
                id="distill-limit"
                type="number"
                className="form-input"
                placeholder="Process all sessions"
                value={limit}
                min={1}
                onChange={(e) => setLimit(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ maxWidth: 200 }}
              />
              <span className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                Leave blank to process all unprocessed sessions.
              </span>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="distill-dryrun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="distill-dryrun" style={{ cursor: 'pointer', fontSize: 13 }}>Dry run (preview only, no writes)</label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || Boolean(operationId && !result && !error)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Play size={14} /> {submitting ? 'Starting…' : 'Start Distill'}
              </button>
              {(operationId || result || error) && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw size={14} /> Reset
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {operationId && !result && !error && (
        <div style={{ marginTop: 20 }}>
          <ProgressBar
            operationId={operationId}
            onComplete={handleComplete}
            onError={(msg) => setError(msg)}
          />
        </div>
      )}
    </div>
  );
}
