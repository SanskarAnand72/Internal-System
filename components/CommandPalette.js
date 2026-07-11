'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function CommandPalette() {
  const router = useRouter();
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSelectedClient,
    showToast,
    setEmailModalData
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [commandPaletteOpen]);

  // Handle keyboard shortcut ⌘K / Ctrl+K & Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const items = [
    { label: "Launch Recovery Campaign", icon: "🚀", shortcut: "↵", action: "launch", group: "Actions" },
    { label: "Sync Google Recovery Sheet", icon: "🔄", action: "sync", group: "Actions" },
    { label: "Generate Recovery Emails", icon: "✉️", action: "generate", group: "Actions" },
    { label: "Export Client Report", icon: "📊", action: "export", group: "Actions" },
    
    { label: "Go to Overview Dashboard", icon: "⚡", action: "nav-overview", group: "Navigation" },
    { label: "Go to Recovery Queue", icon: "🎯", action: "nav-queue", group: "Navigation" },
    { label: "View Google Sheet Data", icon: "📊", action: "nav-sheet", group: "Navigation" },
    { label: "Open Replies Inbox", icon: "💬", action: "nav-replies", group: "Navigation" },
    { label: "View Automation Status", icon: "🤖", action: "nav-automation", group: "Navigation" },
    { label: "Open Analytics Dashboard", icon: "📈", action: "nav-analytics", group: "Navigation" },
    
    { label: "Switch Client to Mercato Agency", icon: "🏢", action: "client-mercato", group: "Switch Client" },
    { label: "Switch Client to Acme Agency", icon: "🏢", action: "client-acme", group: "Switch Client" },
    { label: "Switch Client to TechFlow", icon: "🏢", action: "client-techflow", group: "Switch Client" }
  ];

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.group.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (item) => {
    setCommandPaletteOpen(false);
    setQuery('');

    if (item.action.startsWith('nav-')) {
      const page = item.action.replace('nav-', '');
      const path = page === 'overview' ? '/' : `/${page}`;
      router.push(path);
    } else if (item.action.startsWith('client-')) {
      const client = item.action.replace('client-', '');
      const clientName = client === 'mercato' ? 'Mercato Agency' : client === 'acme' ? 'Acme Agency' : 'TechFlow';
      setSelectedClient(clientName);
      showToast(`🏢 Switched workspace to ${clientName}`, 'success');
    } else {
      if (item.action === 'launch') showToast('🚀 Recovery campaign triggered in n8n', 'primary');
      if (item.action === 'sync') showToast('🔄 Google Recovery Sheet sync triggered', 'success');
      if (item.action === 'generate') {
        setEmailModalData({
          company: "Batch Action",
          to: "all@clients.com",
          subject: "Custom recovery draft",
          body: "Multiple recovery emails will be generated dynamically.",
          reason: "Batch generation requested via Command Palette."
        });
      }
      if (item.action === 'export') showToast('📊 Client PDF report exported successfully', 'success');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[activeIdx]) {
        handleAction(filteredItems[activeIdx]);
      }
    }
  };

  // Group items by their group property
  const groups = {};
  filteredItems.forEach((item, index) => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push({ ...item, globalIndex: index });
  });

  return (
    <div className="cmd-overlay" onClick={() => setCommandPaletteOpen(false)}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
      <div className="cmd-search-row">
          <svg className="cmd-search-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search clients, actions, leads…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
            autoComplete="off"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="cmd-results">
          {Object.keys(groups).map(groupName => (
            <div key={groupName}>
              <div className="cmd-group-label">{groupName}</div>
              {groups[groupName].map(item => (
                <div
                  key={item.label}
                  className={`cmd-item ${item.globalIndex === activeIdx ? 'active' : ''}`}
                  onClick={() => handleAction(item)}
                  onMouseEnter={() => setActiveIdx(item.globalIndex)}
                >
                  <span className="cmd-item-icon">{item.icon}</span>
                  {item.label}
                  {item.shortcut && <span className="cmd-shortcut">{item.shortcut}</span>}
                </div>
              ))}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)' }}>
              No actions found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
