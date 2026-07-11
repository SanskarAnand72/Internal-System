'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useSession } from 'next-auth/react';

export default function Topbar() {
  const {
    selectedClient,
    setSelectedClient,
    setCommandPaletteOpen,
    showToast
  } = useApp();

  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const clientList = [
    { name: "Mercato Agency", avatar: "M", rows: 487, opp: 127, gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
    { name: "Acme Agency", avatar: "A", rows: 312, opp: 84, gradient: "linear-gradient(135deg,#0ea5e9,#06b6d4)" },
    { name: "TechFlow", avatar: "T", rows: 201, opp: 53, gradient: "linear-gradient(135deg,#10b981,#059669)" },
    { name: "Pixel Studio", avatar: "P", rows: 149, opp: 39, gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { name: "GrowthLab", avatar: "G", rows: 98, opp: 22, gradient: "linear-gradient(135deg,#f43f5e,#e11d48)" }
  ];

  const handleClientSelect = (e, clientName) => {
    e.stopPropagation();
    setSelectedClient(clientName);
    setDropdownOpen(false);
    showToast(`🏢 Switched workspace to ${clientName}`, 'success');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Client Switcher */}
        <div className="client-switcher" id="client-switcher">
          <div
            className="client-switcher-trigger"
            id="client-trigger"
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(prev => !prev); }}
          >
            <div className="client-dot"></div>
            <span id="client-name-display">{selectedClient}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {dropdownOpen && (
            <div className="client-dropdown" id="client-dropdown" onClick={e => e.stopPropagation()}>
              <div className="client-dropdown-header">Switch Client</div>
              {clientList.map(client => (
                <div
                  key={client.name}
                  className={`client-option ${selectedClient === client.name ? 'active' : ''}`}
                  onClick={(e) => handleClientSelect(e, client.name)}
                >
                  <div className="co-avatar" style={{ background: client.gradient }}>{client.avatar}</div>
                  <div className="co-info">
                    <div className="co-name">{client.name}</div>
                    <div className="co-meta">{client.rows} rows · {client.opp} opp</div>
                  </div>
                  {selectedClient === client.name && <div className="co-check">✓</div>}
                </div>
              ))}
              <div className="client-dropdown-footer">
                <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }} onClick={() => showToast('Create client interface coming soon', 'primary')}>
                  + Add New Client
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="topbar-divider"></div>
        
        <button className="topbar-cmd-btn" id="topbar-cmd" onClick={() => setCommandPaletteOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
          </svg>
          Command
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <div className="topbar-status">
          <span className="pulse-dot green-dot"></span>
          <span id="topbar-status-text">n8n Running · Last sync 2 min ago</span>
        </div>
        
        <button className="topbar-icon-btn" title="Notifications" onClick={() => showToast('4 unread operational notifications', 'primary')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="notif-dot">4</span>
        </button>
        
        {session?.user?.image ? (
          <img src={session.user.image} className="topbar-avatar" alt="Avatar" style={{ objectFit: 'cover', borderRadius: '6px' }} />
        ) : (
          <div className="topbar-avatar">{session?.user?.name?.[0] || 'S'}</div>
        )}
      </div>
    </header>
  );
}
