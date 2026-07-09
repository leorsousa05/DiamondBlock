import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Brain, History, FolderGit2, Flame, Plug, Sun, Moon } from 'lucide-react';
import { api } from '../api/client';
import type { VaultStatus } from '../api/client';
import logoIcon from '../assets/diamondblock-icon.png';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Main',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutGrid }],
  },
  {
    heading: 'Memory',
    items: [{ label: 'Memories', to: '/memories', icon: Brain }],
  },
  {
    heading: 'Data',
    items: [
      { label: 'Sessions', to: '/sessions', icon: History },
      { label: 'Codebase Index', to: '/index', icon: FolderGit2 },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { label: 'Distill', to: '/distill', icon: Flame },
      { label: 'MCP Install', to: '/mcp-install', icon: Plug },
    ],
  },
];

export default function Sidebar() {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [isDark, setIsDark] = useState(() => {
    const localTheme = localStorage.getItem('theme');
    if (localTheme) return localTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => null);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={logoIcon} alt="DiamondBlock Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span>DiamondBlock</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} style={{ marginBottom: 8 }}>
            <div
              style={{
                padding: '6px 16px 4px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: 'var(--color-text-muted)',
              }}
            >
              {group.heading}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
                  textDecoration: 'none',
                  borderRadius: 0,
                  transition: 'color 0.12s ease, background-color 0.12s ease',
                })}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (!el.getAttribute('aria-current')) {
                    el.style.backgroundColor = 'var(--color-surface-hover)';
                    el.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (!el.getAttribute('aria-current')) {
                    el.style.backgroundColor = 'transparent';
                    el.style.color = 'var(--color-text-secondary)';
                  }
                }}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Theme Switcher & Footer */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px' }}>
        <button
          onClick={() => setIsDark(!isDark)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            justifyContent: 'center',
            marginBottom: '12px',
            transition: 'background-color 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg)')}
        >
          {isDark ? (
            <>
              <Sun size={14} /> Light Theme
            </>
          ) : (
            <>
              <Moon size={14} /> Dark Theme
            </>
          )}
        </button>

        {status && (
          <div style={{ fontSize: 11 }}>
            <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>
              v{status.version}
            </div>
            <div
              style={{
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={status.embeddingProvider}
            >
              Embeds: {status.embeddingProvider}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
