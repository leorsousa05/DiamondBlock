import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { VaultStatus, Memory, Session } from '../api/client';
import { LayoutGrid, Brain, History, FolderGit2, Flame, Plug, BarChart3, TrendingUp, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export default function StatusPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStatus(),
      api.listMemories({ limit: 5 }),
      api.listMemories({ limit: 1000 }), // fetch more to calculate type distribution
      api.listSessions({ limit: 5 }),
    ])
      .then(([statusData, recentMems, allMems, recentSess]) => {
        setStatus(statusData);
        setRecentMemories(recentMems);
        setAllMemories(allMems);
        setRecentSessions(recentSess);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="loading-text">Loading Dashboard…</div>;
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <div className="alert alert-error">⚠️ {error}</div>
      </div>
    );
  }

  if (!status) return null;

  // Calculate Memory Type distribution
  const typeCounts = {
    user: 0,
    project: 0,
    knowledge: 0,
    distilled: 0,
  };

  allMemories.forEach((mem) => {
    if (mem.type in typeCounts) {
      typeCounts[mem.type as keyof typeof typeCounts]++;
    }
  });

  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  // SVG Bar Chart metrics
  const barChartWidth = 320;
  const barChartHeight = 160;
  const barPadding = 16;
  const barData = [
    { label: 'User', count: typeCounts.user, color: '#3b82f6' },
    { label: 'Project', count: typeCounts.project, color: '#10b981' },
    { label: 'Knowledge', count: typeCounts.knowledge, color: '#f59e0b' },
    { label: 'Distilled', count: typeCounts.distilled, color: '#8b5cf6' },
  ];
  const barWidth = (barChartWidth - barPadding * (barData.length + 1)) / barData.length;

  // SVG Line Chart metrics for Session Activity (last 5 sessions message counts)
  const lineChartWidth = 320;
  const lineChartHeight = 160;
  const linePadding = 30;
  // Reverse to make it chronological
  const sessionPoints = [...recentSessions].reverse().map((s) => s.messageCount);
  const maxMsgCount = Math.max(...sessionPoints, 5);

  const getLineCoordinates = () => {
    if (sessionPoints.length === 0) return '';
    const stepX = (lineChartWidth - linePadding * 2) / Math.max(sessionPoints.length - 1, 1);
    return sessionPoints
      .map((val, index) => {
        const x = linePadding + index * stepX;
        const y = lineChartHeight - linePadding - (val / maxMsgCount) * (lineChartHeight - linePadding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LayoutGrid size={28} style={{ color: 'var(--color-accent)' }} /> Dashboard
          </h1>
          <p style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 13 }}>
            DiamondBlock Vault Overview · Local Semantic Server v{status.version}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 30 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/memories')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Total Memories</div>
            <Brain size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="stat-value">{status.memoryCount.toLocaleString()}</div>
          <div className="stat-sub">stored in vault</div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/sessions')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Total Sessions</div>
            <History size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value">{status.sessionCount.toLocaleString()}</div>
          <div className="stat-sub">logged conversations</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Embedding Provider</div>
            <TrendingUp size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-value" style={{ fontSize: 16, wordBreak: 'break-word', lineHeight: 1.4, marginTop: 8 }}>
            {status.embeddingProvider}
          </div>
          <div className="stat-sub">semantic vector source</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label">Vault Directory</div>
            <FolderGit2 size={18} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="stat-value monospace" style={{ fontSize: 10, wordBreak: 'break-all', lineHeight: 1.4, marginTop: 8 }}>
            {status.vaultPath}
          </div>
          <div className="stat-sub">local storage location</div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 30, flexWrap: 'wrap' }}>
        {/* Memory Types Bar Chart */}
        <div className="card" style={{ flex: 1, minWidth: 340 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} style={{ color: 'var(--color-accent)' }} />
            <span>Memory Distribution by Type</span>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <svg width={barChartWidth} height={barChartHeight}>
              {/* Grid line */}
              <line x1={0} y1={barChartHeight - 30} x2={barChartWidth} y2={barChartHeight - 30} stroke="var(--color-border)" strokeWidth={1} />
              {barData.map((data, index) => {
                const x = barPadding + index * (barWidth + barPadding);
                const height = (data.count / maxTypeCount) * (barChartHeight - 60);
                const y = barChartHeight - 30 - height;
                return (
                  <g key={data.label}>
                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(height, 2)}
                      fill={data.color}
                      rx={4}
                      style={{ transition: 'all 0.5s ease' }}
                    />
                    {/* Count label above bar */}
                    <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="var(--color-text-secondary)" fontWeight={600}>
                      {data.count}
                    </text>
                    {/* X Axis Label */}
                    <text x={x + barWidth / 2} y={barChartHeight - 12} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
                      {data.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sessions Activity Line Chart */}
        <div className="card" style={{ flex: 1, minWidth: 340 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
            <span>Session Message Density (Chronological)</span>
          </div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            {sessionPoints.length > 0 ? (
              <svg width={lineChartWidth} height={lineChartHeight}>
                {/* Horizontal grid lines */}
                <line x1={linePadding} y1={linePadding} x2={lineChartWidth - linePadding} y2={linePadding} stroke="var(--color-border)" strokeDasharray="3 3" />
                <line x1={linePadding} y1={lineChartHeight - linePadding} x2={lineChartWidth - linePadding} y2={lineChartHeight - linePadding} stroke="var(--color-border)" />
                {/* Line Path */}
                <path d={getLineCoordinates()} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {/* Points */}
                {sessionPoints.map((val, index) => {
                  const stepX = (lineChartWidth - linePadding * 2) / Math.max(sessionPoints.length - 1, 1);
                  const x = linePadding + index * stepX;
                  const y = lineChartHeight - linePadding - (val / maxMsgCount) * (lineChartHeight - linePadding * 2);
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r={4} fill="var(--color-surface)" stroke="#10b981" strokeWidth={2} />
                      <text x={x} y={y - 8} textAnchor="middle" fontSize={9} fill="var(--color-text-secondary)" fontWeight={600}>
                        {val} msg
                      </text>
                    </g>
                  );
                })}
                {/* Bottom X-axis caption */}
                <text x={lineChartWidth / 2} y={lineChartHeight - 6} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
                  Recent Sessions
                </text>
              </svg>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No session history logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* Previews Grid */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Recent Memories Preview */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
              <Brain size={16} style={{ color: 'var(--color-accent)' }} /> Recent Memories
            </h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => navigate('/memories')}>
              View all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentMemories.map((mem) => (
              <div
                key={mem.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.12s' }}
                onClick={() => navigate(`/memories/${mem.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <div className="card-body" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                      {mem.title}
                    </h4>
                    <StatusBadge variant={mem.type} />
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                      marginBottom: 8,
                    }}
                  >
                    {mem.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)' }}>
                    <span>Scope: {mem.scope}</span>
                    <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {recentMemories.length === 0 && (
              <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No memories saved yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions Preview */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 600 }}>
              <History size={16} style={{ color: '#10b981' }} /> Recent Sessions
            </h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => navigate('/sessions')}>
              View all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentSessions.map((sess) => (
              <div
                key={sess.id}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.12s' }}
                onClick={() => navigate(`/sessions/${sess.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <div className="card-body" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
                      Session: {sess.id.substring(0, 12)}...
                    </h4>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Project: {sess.projectId} · {new Date(sess.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>
                        {sess.messageCount} messages
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge variant={sess.processed ? 'success' : 'default'} label={sess.processed ? 'Distilled' : 'Pending'} />
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                No sessions logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Tools Header */}
      <div className="section" style={{ marginTop: 40, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/index')}>
            <FolderGit2 size={14} /> Browse Codebase Index
          </button>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/distill')}>
            <Flame size={14} /> Session Distillation
          </button>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/mcp-install')}>
            <Plug size={14} /> MCP Installation
          </button>
        </div>
      </div>
    </div>
  );
}
