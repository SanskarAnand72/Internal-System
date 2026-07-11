'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useSession, signOut } from 'next-auth/react';

const NAV = [
  {
    section: 'Operations',
    items: [
      {
        href: '/',
        label: 'Overview',
        badge: { text: 'Live', cls: 'glow' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        href: '/queue',
        label: 'Recovery Queue',
        badge: { text: '127', cls: 'hot' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        href: '/audit',
        label: 'AI Audit',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="13" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M5 8h1M10 8h1" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        href: '/campaigns',
        label: 'Campaigns',
        badge: { text: '4', cls: '' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 6-12 6V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Inbox',
    items: [
      {
        href: '/inbox',
        label: 'Replies Inbox',
        badge: { text: '6', cls: 'hot' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M14 3H2a1 1 0 00-1 1v7a1 1 0 001 1h4l2 2 2-2h4a1 1 0 001-1V4a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        href: '/approval',
        label: 'Message Approval',
        badge: { text: '12', cls: '' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M13 4L6 11l-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        href: '/meetings',
        label: 'Meetings',
        badge: { text: '4', cls: '' },
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Data & Tools',
    items: [
      {
        href: '/sheet',
        label: 'Recovery Sheet',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 5h14M5 5v10M9 5v10" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        ),
      },
      {
        href: '/automation',
        label: 'Automation',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        href: '/analytics',
        label: 'Analytics',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M2 12l4-4 3 3 5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        href: '/reports',
        label: 'Reports',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <path d="M10 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5l-4-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M10 1v4h4M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Workspace',
    items: [
      {
        href: '/team',
        label: 'Team',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1 14c0-3 2-5 5-5M11 10l1.5 1.5L15 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        href: '/settings',
        label: 'Settings',
        icon: (
          <svg className="nav-svg" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M11.54 4.46L13 3.05M3.05 12.95l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        ),
      },
    ],
  },
];

const ROLE_COLORS = {
  Owner:    { bg: 'rgba(251,191,36,.15)',  color: '#f59e0b' },
  Operator: { bg: 'rgba(129,140,248,.15)', color: 'var(--violet)' },
  Viewer:   { bg: 'rgba(255,255,255,.08)', color: 'var(--text-3)' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { setCommandPaletteOpen, workspace } = useApp();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const roleStyle = ROLE_COLORS[role] || ROLE_COLORS.Viewer;

  const handleSignOut = async () => {
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
    } catch (error) {
      console.warn('Failed to clear stored Google tokens before sign out:', error);
    }

    await signOut({ callbackUrl: '/login' });
  };

  const isActive = (href) => pathname === href;

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="url(#sg1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="sg1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8"/>
                <stop offset="1" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div className="logo-text">Internal System</div>
          <div className="logo-sub">AI Command Center</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(group => (
          <React.Fragment key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`nav-badge ${item.badge.cls}`}>{item.badge.text}</span>
                )}
              </Link>
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {session?.user?.image ? (
            <img src={session.user.image} className="user-avatar" alt="Avatar" style={{ objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <div className="user-avatar">{session?.user?.name?.[0] || 'S'}</div>
          )}
          <div className="user-info" style={{ flex: 1, minWidth: 0, marginLeft: '8px' }}>
            <div className="user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                {session?.user?.name || 'User'}
              </span>
              {role && (
                <span style={{
                  flexShrink: 0, fontSize: '8.5px', fontWeight: 800, letterSpacing: '.4px',
                  padding: '1.5px 5px', borderRadius: '4px',
                  background: roleStyle.bg, color: roleStyle.color,
                }}>
                  {role.toUpperCase()}
                </span>
              )}
            </div>
            <div className="user-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px' }}>
              {workspace?.name || session?.user?.email || ''}
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--transition)'
            }}
            title="Sign out"
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
        <div
          className="sidebar-shortcut"
          id="open-cmd"
          onClick={() => setCommandPaletteOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>⌘K</span>
          <span style={{ fontSize: '10px', opacity: 0.45 }}>Command</span>
        </div>
      </div>
    </aside>
  );
}
