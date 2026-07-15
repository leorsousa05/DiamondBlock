import React, { useState } from 'react';
import { api } from '../api/client';
import type { IndexEvaluationReport, IndexEvaluationQueryResult } from '../api/client';
import { DataTable } from './DataTable';
import { FlaskConical } from 'lucide-react';

interface EvaluationPanelProps {
  projectPath: string;
  onEvaluationComplete?: () => void;
}

interface QueryResultRow {
  id: string;
  result: IndexEvaluationQueryResult;
}

function parseCsv(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function hitBadge(hit: boolean) {
  return (
    <span className={`badge ${hit ? 'badge-success' : 'badge-default'}`} style={{ fontSize: 11 }}>
      {hit ? 'hit' : 'miss'}
    </span>
  );
}

function parserModeBadgeClass(mode: string): string {
  if (mode === 'ast') return 'badge-success';
  if (mode === 'simplified') return 'badge-warning';
  return 'badge-default';
}

export function EvaluationPanel({ projectPath, onEvaluationComplete }: EvaluationPanelProps) {
  const [query, setQuery] = useState('');
  const [expectedFiles, setExpectedFiles] = useState('');
  const [expectedSymbols, setExpectedSymbols] = useState('');
  const [limit, setLimit] = useState(5);
  const [force, setForce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IndexEvaluationReport | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setError('A query is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.evaluateIndex({
        projectPath: projectPath || undefined,
        query: query.trim(),
        expectedFiles: parseCsv(expectedFiles),
        expectedSymbols: parseCsv(expectedSymbols),
        limit,
        force,
      });
      setReport(result);
      onEvaluationComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setSubmitting(false);
    }
  }

  const resultColumns = [
    {
      header: 'Query',
      key: 'query',
      render: (row: QueryResultRow) => (
        <span style={{ fontSize: 12 }}>{row.result.query}</span>
      ),
    },
    { header: 'Top 1', key: 'hitTop1', width: '70px', render: (row: QueryResultRow) => hitBadge(row.result.hitTop1) },
    { header: 'Top 3', key: 'hitTop3', width: '70px', render: (row: QueryResultRow) => hitBadge(row.result.hitTop3) },
    { header: 'Top 5', key: 'hitTop5', width: '70px', render: (row: QueryResultRow) => hitBadge(row.result.hitTop5) },
    {
      header: 'Tokens (est.)',
      key: 'tokens',
      width: '130px',
      render: (row: QueryResultRow) => (
        <span className="monospace" style={{ fontSize: 12 }}>
          {row.result.retrievedTokenEstimate}/{row.result.baselineTokenEstimate}
        </span>
      ),
    },
    {
      header: 'Saved',
      key: 'saved',
      width: '80px',
      render: (row: QueryResultRow) => (
        <span className="badge badge-info" style={{ fontSize: 11 }}>
          {row.result.tokenReductionPercent.toFixed(1)}%
        </span>
      ),
    },
  ];

  const resultRows: QueryResultRow[] = (report?.queries ?? []).map((result) => ({
    id: result.queryId,
    result,
  }));

  return (
    <div>
      <div className="section">
        <div className="section-title">Evaluate Search Quality</div>
        <div className="card" style={{ maxWidth: 620 }}>
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="evalQuery">Query</label>
                <input
                  id="evalQuery"
                  className="form-input"
                  placeholder="e.g. typescript parser relation candidates"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="evalFiles">Expected files (comma-separated)</label>
                  <input
                    id="evalFiles"
                    className="form-input monospace"
                    style={{ fontSize: 12 }}
                    placeholder="src/infrastructure/typescript_parser.ts"
                    value={expectedFiles}
                    onChange={(e) => setExpectedFiles(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="evalSymbols">Expected symbols (comma-separated)</label>
                  <input
                    id="evalSymbols"
                    className="form-input monospace"
                    style={{ fontSize: 12 }}
                    placeholder="TypeScriptParser"
                    value={expectedSymbols}
                    onChange={(e) => setExpectedSymbols(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="evalLimit">Limit</label>
                  <input
                    id="evalLimit"
                    type="number"
                    min={1}
                    max={50}
                    className="form-input"
                    style={{ width: 90 }}
                    value={limit}
                    onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                  />
                </div>
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="evalForce"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                  />
                  <label htmlFor="evalForce">Force re-index before evaluating</label>
                </div>
              </div>

              {error && <div className="alert alert-error">⚠️ {error}</div>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <FlaskConical size={14} /> {submitting ? 'Evaluating…' : 'Run Evaluation'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {report && (
        <div>
          <hr className="divider" />
          <div className="section">
            <div className="section-title">Report — {report.projectId}</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Files</div>
                <div className="stat-value">{report.totals.filesIndexed.toLocaleString()}</div>
                <div className="stat-sub">indexed files</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Chunks</div>
                <div className="stat-value">{report.totals.chunksIndexed.toLocaleString()}</div>
                <div className="stat-sub">code chunks</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Relations</div>
                <div className="stat-value">{report.totals.relationsIndexed.toLocaleString()}</div>
                <div className="stat-sub">relation candidates</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Token Saving</div>
                <div className="stat-value">{report.tokenSavings.averageReductionPercent.toFixed(1)}%</div>
                <div className="stat-sub">avg, {report.tokenSavings.method} estimate</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
              <span className={`badge ${parserModeBadgeClass('ast')}`}>AST: {report.parserModes.ast}</span>
              <span className={`badge ${parserModeBadgeClass('simplified')}`}>Simplified: {report.parserModes.simplified}</span>
              <span className={`badge ${parserModeBadgeClass('fallback')}`}>Fallback: {report.parserModes.fallback}</span>
            </div>

            <DataTable
              columns={resultColumns}
              rows={resultRows}
              emptyMessage="No query results in this report."
            />
          </div>
        </div>
      )}
    </div>
  );
}
