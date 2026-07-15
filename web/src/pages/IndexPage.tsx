import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { IndexStatus, CodeChunk, FileSystemBrowseResult } from '../api/client';
import { DataTable } from '../components/DataTable';
import { SearchBar } from '../components/SearchBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProgressBar } from '../components/ProgressBar';
import { EvaluationPanel } from '../components/EvaluationPanel';
import { FolderGit2, Trash2, FolderOpen, Folder, File, ArrowUp, X, Play } from 'lucide-react';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
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

export default function IndexPage() {
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Run Index form
  const [projectPath, setProjectPath] = useState('');
  const [force, setForce] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSubmitting, setRunSubmitting] = useState(false);

  // Folder Browser Modal
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [browseResult, setBrowseResult] = useState<FileSystemBrowseResult | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Chunks tab
  const [activeTab, setActiveTab] = useState<'status' | 'chunks' | 'evaluate'>('status');
  const [chunks, setChunks] = useState<CodeChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunkQuery, setChunkQuery] = useState('');
  const [chunkLang, setChunkLang] = useState('');
  const [chunkType, setChunkType] = useState('');
  const [chunkPath, setChunkPath] = useState('');

  // Purge / Clean Orphans
  const [showPurge, setShowPurge] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [showClean, setShowClean] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function fetchStatus() {
    setStatusLoading(true);
    api
      .getIndexStatus()
      .then((data) => {
        setIndexStatus(data);
        setStatusError(null);
      })
      .catch((err: Error) => setStatusError(err.message))
      .finally(() => setStatusLoading(false));
  }

  useEffect(() => {
    fetchStatus();
    // Default project path to process.cwd() of the server
    api.browseDirectory()
      .then((data) => {
        setProjectPath(data.currentPath);
      })
      .catch(() => null);
  }, []);

  const fetchChunks = useCallback(() => {
    setChunksLoading(true);
    const req = chunkQuery
      ? api.searchChunks(chunkQuery)
      : api.listChunks({ limit: 50 });
    req
      .then(setChunks)
      .catch(() => setChunks([]))
      .finally(() => setChunksLoading(false));
  }, [chunkQuery]);

  useEffect(() => {
    if (activeTab === 'chunks') fetchChunks();
  }, [activeTab, fetchChunks]);

  async function handleRunIndex(e: React.FormEvent) {
    e.preventDefault();
    setRunError(null);
    setRunResult(null);
    setOperationId(null);
    setRunSubmitting(true);
    try {
      const res = await api.runIndex({
        projectPath: projectPath || undefined,
        force,
        dryRun,
      });
      setOperationId(res.operationId);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : 'Failed to start indexing');
    } finally {
      setRunSubmitting(false);
    }
  }

  // Directory Browser Functions
  const handleOpenFolderPicker = async () => {
    setShowFolderPicker(true);
    fetchDirectory(projectPath || undefined);
  };

  const fetchDirectory = async (path?: string) => {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const data = await api.browseDirectory(path);
      setBrowseResult(data);
    } catch (err: unknown) {
      setBrowseError(err instanceof Error ? err.message : 'Failed to browse directory');
    } finally {
      setBrowseLoading(false);
    }
  };

  const handleSelectFolder = () => {
    if (browseResult) {
      setProjectPath(browseResult.currentPath);
    }
    setShowFolderPicker(false);
  };

  async function handlePurge() {
    setPurgeLoading(true);
    try {
      const res = await api.purgeIndex();
      setPurgeResult(`Deleted ${res.deleted} chunks`);
      setShowPurge(false);
      fetchStatus();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setPurgeLoading(false);
    }
  }

  async function handleCleanOrphans() {
    setCleanLoading(true);
    try {
      const res = await api.cleanOrphans();
      setCleanResult(`Cleaned ${res.cleaned} orphan entries`);
      setShowClean(false);
      fetchStatus();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Clean failed');
    } finally {
      setCleanLoading(false);
    }
  }

  const chunkColumns = [
    {
      header: 'File',
      key: 'filePath',
      render: (row: CodeChunk) => (
        <span className="monospace" style={{ fontSize: 12 }}>{row.filePath}</span>
      ),
    },
    {
      header: 'Lines',
      key: 'startLine',
      width: '90px',
      render: (row: CodeChunk) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {row.startLine}–{row.endLine}
        </span>
      ),
    },
    ...(chunkQuery.trim() ? [{
      header: 'Match',
      key: 'score',
      width: '80px',
      render: (row: CodeChunk & { score?: number }) => (
        <span className="badge badge-success" style={{ fontWeight: 600, fontSize: 11 }}>
          {typeof row.score === 'number' ? `${(row.score * 100).toFixed(0)}%` : '—'}
        </span>
      ),
    }] : []),
    {
      header: 'Type',
      key: 'chunkType',
      width: '100px',
    },
    {
      header: 'Mode',
      key: 'parsingMode',
      width: '110px',
      render: (row: CodeChunk) => {
        const mode = row.metadata?.parsingMode;
        if (!mode) return '—';
        const badgeClass = mode === 'ast' ? 'badge-success' : mode === 'simplified' ? 'badge-warning' : 'badge-default';
        return (
          <span className={`badge ${badgeClass}`} style={{ fontSize: 11 }}>
            {mode}{typeof row.metadata?.relationCount === 'number' && row.metadata.relationCount > 0
              ? ` · ${row.metadata.relationCount} rel`
              : ''}
          </span>
        );
      },
    },
    {
      header: 'Lang',
      key: 'language',
      width: '80px',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderGit2 size={24} style={{ color: 'var(--color-accent)' }} /> Codebase Index
        </h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowClean(true)}>
            🧹 Clean Orphans
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowPurge(true)}>
            <Trash2 size={14} /> Purge Index
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {actionError}</div>
      )}
      {purgeResult && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {purgeResult}</div>
      )}
      {cleanResult && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {cleanResult}</div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status & Run
        </button>
        <button
          className={`tab-btn ${activeTab === 'chunks' ? 'active' : ''}`}
          onClick={() => setActiveTab('chunks')}
        >
          Chunks
        </button>
        <button
          className={`tab-btn ${activeTab === 'evaluate' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluate')}
        >
          Evaluate
        </button>
      </div>

      {activeTab === 'status' && (
        <div>
          {/* Index Status */}
          <div className="section">
            <div className="section-title">Current Status</div>
            {statusLoading ? (
              <div className="loading-text">Loading…</div>
            ) : statusError ? (
              <div className="alert alert-error">⚠️ {statusError}</div>
            ) : indexStatus ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Files</div>
                  <div className="stat-value">{indexStatus.fileCount.toLocaleString()}</div>
                  <div className="stat-sub">indexed files</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Chunks</div>
                  <div className="stat-value">{indexStatus.chunkCount.toLocaleString()}</div>
                  <div className="stat-sub">code chunks</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Last Indexed</div>
                  <div className="stat-value" style={{ fontSize: 14 }}>
                    {formatDate(indexStatus.lastIndexedAt)}
                  </div>
                </div>
                {indexStatus.projectId && (
                  <div className="stat-card">
                    <div className="stat-label">Project</div>
                    <div className="stat-value monospace" style={{ fontSize: 13 }}>
                      {indexStatus.projectId}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <hr className="divider" />

          {/* Run Index Form */}
          <div className="section">
            <div className="section-title">Run Indexer</div>
            <div className="card" style={{ maxWidth: 620 }}>
              <div className="card-body">
                <form
                  onSubmit={handleRunIndex}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="projectPath">
                      Project Path
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        id="projectPath"
                        className="form-input monospace"
                        style={{ flex: 1, fontSize: 13 }}
                        placeholder="e.g. /home/user/my-project"
                        value={projectPath}
                        onChange={(e) => setProjectPath(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        onClick={handleOpenFolderPicker}
                      >
                        <FolderOpen size={14} /> Select...
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20 }}>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="force"
                        checked={force}
                        onChange={(e) => setForce(e.target.checked)}
                      />
                      <label htmlFor="force">Force re-index</label>
                    </div>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="dryRun"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                      />
                      <label htmlFor="dryRun">Dry run</label>
                    </div>
                  </div>

                  {runError && (
                    <div className="alert alert-error">⚠️ {runError}</div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={runSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                  >
                    <Play size={14} /> {runSubmitting ? 'Starting…' : 'Run Index'}
                  </button>
                </form>
              </div>
            </div>

            {operationId && (
              <div style={{ maxWidth: 620, marginTop: 16 }}>
                <ProgressBar
                  operationId={operationId}
                  onComplete={(result) => {
                    const r = result as Record<string, unknown>;
                    setRunResult(
                      `Indexing complete — ${r?.indexed ?? r?.fileCount ?? ''} files processed`
                    );
                    fetchStatus();
                  }}
                  onError={(msg) => setRunError(msg)}
                />
              </div>
            )}

            {runResult && (
              <div className="alert alert-success" style={{ maxWidth: 620, marginTop: 12 }}>
                ✓ {runResult}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'chunks' && (() => {
        const filteredChunks = chunks.filter((c) => {
          if (chunkLang && c.language?.toLowerCase() !== chunkLang.toLowerCase()) return false;
          if (chunkType && c.chunkType?.toLowerCase() !== chunkType.toLowerCase()) return false;
          if (chunkPath && !c.filePath?.toLowerCase().includes(chunkPath.toLowerCase())) return false;
          return true;
        });

        return (
          <div>
            {/* Chunks Advanced Filters */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <SearchBar placeholder="Search code chunks semantically via embeddings…" onChange={setChunkQuery} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>File Path</label>
                    <input
                      className="form-input"
                      placeholder="Filter by path…"
                      value={chunkPath}
                      onChange={(e) => setChunkPath(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Language</label>
                    <select
                      className="form-select"
                      value={chunkLang}
                      onChange={(e) => setChunkLang(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13, height: '32px' }}
                    >
                      <option value="">All Languages</option>
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="tsx">TSX</option>
                      <option value="jsx">JSX</option>
                      <option value="json">JSON</option>
                      <option value="markdown">Markdown</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600 }}>Type</label>
                    <select
                      className="form-select"
                      value={chunkType}
                      onChange={(e) => setChunkType(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13, height: '32px' }}
                    >
                      <option value="">All Types</option>
                      <option value="class">Class</option>
                      <option value="function">Function</option>
                      <option value="method">Method</option>
                      <option value="interface">Interface</option>
                      <option value="variable">Variable</option>
                      <option value="file">File</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <DataTable
              columns={chunkColumns}
              rows={filteredChunks}
              loading={chunksLoading}
              emptyMessage="No codebase chunks match your query and filter criteria."
            />
          </div>
        );
      })()}

      {activeTab === 'evaluate' && (
        <EvaluationPanel projectPath={projectPath} onEvaluationComplete={fetchStatus} />
      )}

      {/* Directory Browser Modal */}
      {showFolderPicker && (
        <div className="modal-overlay" onClick={() => setShowFolderPicker(false)}>
          <div className="modal-box" style={{ width: '600px', maxWidth: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <FolderOpen size={18} style={{ color: 'var(--color-accent)' }} /> Select Project Directory
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                onClick={() => setShowFolderPicker(false)}
              >
                <X size={18} />
              </button>
            </div>

            {browseError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{browseError}</div>}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Current Directory
              </div>
              <div className="monospace" style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {browseResult?.currentPath || 'Loading...'}
              </div>
            </div>

            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', height: '280px', overflowY: 'auto', backgroundColor: 'var(--color-surface)', marginBottom: 20 }}>
              {browseLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Scanning directory...
                </div>
              ) : browseResult ? (
                <div>
                  {/* Parent folder link */}
                  {browseResult.parentPath && (
                    <div
                      onClick={() => fetchDirectory(browseResult.parentPath!)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        color: 'var(--color-accent)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <ArrowUp size={14} /> .. (Parent Directory)
                    </div>
                  )}

                  {/* Directories */}
                  {browseResult.directories.map((dir) => (
                    <div
                      key={dir}
                      onClick={() => fetchDirectory(browseResult.currentPath.endsWith('/') || browseResult.currentPath.endsWith('\\') ? browseResult.currentPath + dir : browseResult.currentPath + '/' + dir)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--color-text-primary)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Folder size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dir}</span>
                    </div>
                  ))}

                  {/* Files (Optional display, disabled selection) */}
                  {browseResult.files.map((file) => (
                    <div
                      key={file}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--color-border)',
                        opacity: 0.5,
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <File size={14} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                    </div>
                  ))}

                  {browseResult.directories.length === 0 && browseResult.files.length === 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                      Folder is empty
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFolderPicker(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSelectFolder} disabled={browseLoading || !browseResult}>
                Select Current Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurge && (
        <ConfirmDialog
          title="Purge Index"
          message="This will permanently delete all indexed code chunks. Are you sure?"
          confirmLabel="Purge"
          onConfirm={handlePurge}
          onCancel={() => setShowPurge(false)}
          loading={purgeLoading}
        />
      )}

      {showClean && (
        <ConfirmDialog
          title="Clean Orphans"
          message="Remove all orphaned index entries that no longer have corresponding files?"
          confirmLabel="Clean"
          onConfirm={handleCleanOrphans}
          onCancel={() => setShowClean(false)}
          loading={cleanLoading}
        />
      )}
    </div>
  );
}
