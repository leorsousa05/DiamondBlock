import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { McpTarget } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Plug, Check, AlertCircle, Info, Settings } from 'lucide-react';

export default function McpInstallPage() {
  const [targets, setTargets] = useState<McpTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getMcpTargets()
      .then((data) => {
        setTargets(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleTarget(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === targets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(targets.map((t) => t.name)));
    }
  }

  async function handleInstall() {
    setSubmitError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await api.installMcp({
        targets: Array.from(selected),
        dryRun,
      });
      setResult(res.installed);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plug size={24} style={{ color: 'var(--color-accent)' }} /> MCP Install
        </h1>
      </div>

      <p style={{ marginBottom: 24, color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Install DiamondBlock as an MCP server into your AI coding tool's configuration.
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {submitError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {submitError}
        </div>
      )}
      {result && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <Check size={16} />
              {dryRun ? 'Dry Run Check Complete' : 'Installation Succeeded'}
            </div>
            <p style={{ marginTop: 4 }}>
              {dryRun ? 'Configuration would be written into:' : 'Configured in target profiles:'}
            </p>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {result.map((r) => (
                <li key={r} style={{ fontSize: 13 }}>
                  <strong>{r}</strong> {dryRun ? '(simulated)' : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-text">Loading targets…</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {targets.length} target{targets.length !== 1 ? 's' : ''} available
            </span>
            {targets.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
                {selected.size === targets.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {targets.map((target) => (
              <div
                key={target.name}
                className={`target-card ${selected.has(target.name) ? 'selected' : ''}`}
                onClick={() => toggleTarget(target.name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  border: selected.has(target.name) ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  backgroundColor: selected.has(target.name) ? 'var(--color-accent-light)' : 'var(--color-surface)',
                  borderRadius: 'var(--border-radius)',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(target.name)}
                  onChange={() => toggleTarget(target.name)}
                  onClick={(e) => e.stopPropagation()}
                  id={`target-${target.name}`}
                  style={{ flexShrink: 0, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                    {target.label}
                  </div>
                  <div
                    className="monospace"
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-muted)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={target.configPath}
                  >
                    {target.configPath}
                  </div>
                </div>
                <StatusBadge
                  variant={target.detected ? 'success' : 'default'}
                  label={target.detected ? 'Detected' : 'Not found'}
                />
              </div>
            ))}

            {targets.length === 0 && (
              <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                <Info size={24} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                <p style={{ color: 'var(--color-text-secondary)' }}>No target agent configurations found on this computer.</p>
              </div>
            )}
          </div>

          {targets.length > 0 && (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="mcp-dryrun"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="mcp-dryrun" style={{ fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer', userSelect: 'none' }}>
                    Dry run (preview changes only, do not write to target files)
                  </label>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleInstall}
                  disabled={selected.size === 0 || submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '10px' }}
                >
                  {submitting ? (
                    'Installing…'
                  ) : (
                    <>
                      <Settings size={16} /> Install Selected Targets ({selected.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
