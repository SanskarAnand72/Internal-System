'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function RepliesPage() {
  const { clientData, selectedClient, showToast, syncing, syncData } = useApp();
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState(null);

  const hasError = !!clientData.gmailError;
  const gmailData = clientData.gmailData || {
    unreadCount: 0,
    threads: [],
    categories: { inbox: 0, sent: 0, replies: 0, interested: [], meetingRequested: [], notInterested: [], noResponse: [] }
  };

  const getFilteredThreads = () => {
    if (activeTab === 'all') return gmailData.threads;
    if (activeTab === 'meeting') return gmailData.categories.meetingRequested;
    if (activeTab === 'interested') return gmailData.categories.interested;
    if (activeTab === 'not-interested') return gmailData.categories.notInterested;
    if (activeTab === 'no-response') return gmailData.categories.noResponse;
    return [];
  };

  const filtered = getFilteredThreads();
  const selectedReply = gmailData.threads.find(r => r.id === selected) || gmailData.categories.noResponse.find(r => r.id === selected);

  const getTabCount = (key) => {
    if (key === 'all') return gmailData.threads.length;
    if (key === 'meeting') return gmailData.categories.meetingRequested.length;
    if (key === 'interested') return gmailData.categories.interested.length;
    if (key === 'not-interested') return gmailData.categories.notInterested.length;
    if (key === 'no-response') return gmailData.categories.noResponse.length;
    return 0;
  };

  const CATS = [
    { key: 'all', label: 'All Inbox', dot: 'grey' },
    { key: 'meeting', label: 'Meeting Req.', dot: 'purple' },
    { key: 'interested', label: 'Interested', dot: 'green' },
    { key: 'no-response', label: 'No Response', dot: 'blue' },
    { key: 'not-interested', label: 'Not Interested', dot: 'grey' },
  ];

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Replies Inbox</h1>
        <p className="page-sub">AI-categorized inbox threads derived from Gmail API — {gmailData.unreadCount} unread</p>
      </div>

      {hasError ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '80px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '32px' }}>✉️</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
            Unable to connect to your Gmail Inbox. Verify you have signed in with the correct Google account and try again.
          </p>
          <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => syncData(true)} disabled={syncing}>
            {syncing ? 'Connecting…' : 'Sync Gmail'}
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="reply-tabs">
              {CATS.map(c => (
                <button key={c.key} className={`reply-tab ${activeTab === c.key ? 'active' : ''}`} onClick={() => { setActiveTab(c.key); setSelected(null); }}>
                  <span className={`rt-dot ${c.dot}`} />
                  {c.label}
                  <span className="rt-count">{getTabCount(c.key)}</span>
                </button>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => syncData(true)} disabled={syncing}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              {syncing ? 'Syncing Gmail…' : 'Sync Gmail'}
            </button>
          </div>

          {/* Split pane */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', overflow: 'hidden', minHeight: '400px' }}>
            {/* List panel */}
            <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
              {filtered.map(r => (
                <div
                  key={r.id}
                  className="approval-item"
                  style={{ background: selected === r.id ? 'rgba(255,255,255,.04)' : 'transparent', borderLeft: selected === r.id ? '2px solid var(--violet)' : '2px solid transparent' }}
                  onClick={() => setSelected(r.id)}
                >
                  <div className="ai-item-head">
                    <span className="ai-item-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{r.company}</span>
                    <span className={`reply-cat-tag ${r.category}`}>{r.category}</span>
                  </div>
                  <div className="ai-item-subj" style={{ color: 'var(--text-2)', marginTop: '3px' }}>{r.subject.slice(0, 36)}…</div>
                  <div className="ai-item-meta">{r.name} · {r.time}</div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)' }}>
                  No messages in this category
                </div>
              )}
            </div>

            {/* Preview panel */}
            {selectedReply ? (
              <div className="preview-panel">
                <div className="preview-hdr">
                  <div style={{ minWidth: 0, flex: 1, marginRight: '10px' }}>
                    <div className="preview-company" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedReply.subject}</div>
                    <div className="preview-meta">From: {selectedReply.name} &lt;{selectedReply.email}&gt; · {selectedReply.time}</div>
                  </div>
                  <div className="preview-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
                    <button className="preview-btn" onClick={() => showToast('📅 Google Calendar booking initialized', 'success')}>Book Meeting</button>
                    <button className="preview-btn approve" onClick={() => showToast('✅ Marked as Woned!', 'success')}>Mark Won</button>
                  </div>
                </div>
                <div className="preview-email-box" style={{ flex: 1 }}>
                  <div className="preview-field"><span>From:</span> {selectedReply.name} &lt;{selectedReply.email}&gt;</div>
                  <div className="preview-divider" />
                  <div className="preview-body-text" style={{ lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {selectedReply.snippet}
                  </div>
                </div>

                {/* AI Note */}
                <div className="modal-ai-note" style={{ margin: '10px 0 0' }}>
                  <span>✦</span>
                  <span>AI categorization: <strong>{selectedReply.category.toUpperCase()}</strong>. Outbound connection verified.</span>
                </div>
              </div>
            ) : (
              <div className="preview-placeholder" style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', gap: '8px' }}>
                <div style={{ fontSize: '28px' }}>✉️</div>
                <div style={{ fontWeight: 600 }}>Select a thread to preview</div>
                <div style={{ fontSize: '11px' }}>Click any items in the inbox column</div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
