'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';

// ─── COUNTER ANIMATION ───
function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1000, format, error }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (error) return;
    let start = null;
    const ease = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const current = Math.round(ease(prog) * target);
      setVal(current);
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, error]);

  if (error) {
    return <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>No Data Connected</span>;
  }

  const display = format === 'currency'
    ? '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val.toLocaleString())
    : val.toLocaleString() + suffix;

  return <>{prefix}{display}</>;
}

export default function OverviewPage() {
  const { clientData, selectedClient, showToast, setOpenDrawerId, setEmailModalData, syncing, syncData, activeSpreadsheetId } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');

  const hasError = !!clientData.sheetsError;
  const filteredLeads = activeFilter === 'all' 
    ? clientData.leads 
    : clientData.leads.filter(l => l.tier === activeFilter);

  const openEmailForLead = (lead) => {
    // If user clicks a next action email, show template preview modal
    setEmailModalData({
      company: lead.company,
      to: `${lead.name.toLowerCase().replace(' ', '.')}@${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
      subject: "Quick thought on the project we shelved last quarter",
      body: `Hi ${lead.name.split(' ')[0]},\n\nI noticed you reviewed the proposal we sent over for ${lead.company}.\n\nWould a 15-minute call make sense this week to discuss next steps?\n\nBest,\nSanskar`,
      reason: "Lead scored HIGH. Tone: Curiosity-driven."
    });
  };

  // derived values from Gmail Sync
  const unreadCount = clientData.gmailData?.unreadCount || 0;
  const gmailThreads = clientData.gmailData?.threads || [];
  const inboxCount = clientData.gmailData?.categories?.inbox || 0;

  return (
    <>
      {/* ─── COMMAND HEADER ─── */}
      <div className="command-header">
        <div className="ch-left">
          <div>
            <h1 className="ch-title">AI Command Center</h1>
            <p className="ch-sub">
              Good afternoon — {selectedClient} · 
              {hasError ? " Connect your spreadsheet to start audits" : ` AI synced: ${clientData.sheetName}`}
            </p>
          </div>
          <div className="ch-stat-row">
            <div className="ch-stat">
              <span className="ch-stat-num">
                <AnimatedCounter target={clientData.rows} error={hasError} />
              </span>
              <span className="ch-stat-label">Rows Analysed</span>
            </div>
            <div className="ch-stat-div" />
            <div className="ch-stat">
              <span className="ch-stat-num accent">
                <AnimatedCounter target={clientData.opp} error={hasError} />
              </span>
              <span className="ch-stat-label">Recoverable</span>
            </div>
            <div className="ch-stat-div" />
            <div className="ch-stat">
              <span className="ch-stat-num green">
                <AnimatedCounter target={clientData.rev} format="currency" error={hasError} />
              </span>
              <span className="ch-stat-label">Potential Revenue</span>
            </div>
            <div className="ch-stat-div" />
            <div className="ch-stat">
              <span className="ch-stat-num">
                <AnimatedCounter target={clientData.conf} suffix="%" error={hasError} />
              </span>
              <span className="ch-stat-label">AI Confidence</span>
            </div>
          </div>
        </div>
        <div className="ch-actions">
          <button 
            className="btn-primary" 
            onClick={() => {
              if (hasError) showToast("⚠️ Connect Google Sheet ID inside settings first", "primary");
              else showToast('🚀 Recovery Campaign launched via n8n integration!', 'success');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Launch Campaign
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => {
              if (hasError) showToast("⚠️ No sheet connected to display", "primary");
              else window.open(`https://docs.google.com/spreadsheets/d/${activeSpreadsheetId || ''}`, '_blank');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12M15 9v12"/></svg>
            View Sheet
          </button>
        </div>
      </div>

      {/* ─── ACTION CENTER ─── */}
      <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Today's Action Center</h2>
            <p className="section-sub">Synchronized dashboard variables — status items requiring attention.</p>
          </div>
          <div className="section-badge urgent">
            {hasError ? "No Data Connected" : `${clientData.leads.filter(l => l.tier === 'high').length} high priority`}
          </div>
        </div>
        <div className="action-grid">
          {[
            { 
              tier: 'urgent', 
              icon: '🔥', 
              iconClass: 'urgent', 
              title: 'Review HIGH Priority Leads', 
              desc: hasError ? 'Spreadsheet not connected' : `AI scored ${clientData.leads.filter(l => l.tier === 'high').length} leads as High Recovery Probability.`, 
              tags: [['Google Sheets', 'red'], [selectedClient, '']], 
              count: hasError ? null : clientData.leads.filter(l => l.tier === 'high').length, 
              action: () => setOpenDrawerId('drawer-high-leads')
            },
            { 
              tier: 'blue', 
              icon: '✉️', 
              iconClass: 'blue', 
              title: 'Unread Recovery Emails', 
              desc: `Gmail Inbox lists ${unreadCount} unread responses from campaigns.`, 
              tags: [['Gmail Live', 'blue'], ['Replies Tracker', '']], 
              count: unreadCount,
              action: () => window.location.href = '/inbox'
            },
            { 
              tier: 'green', 
              icon: '📞', 
              iconClass: 'green', 
              title: 'Upcoming Scheduled Meetings', 
              desc: `Google Calendar reports ${clientData.calendarData?.upcoming?.length || 0} upcoming sessions scheduled.`, 
              tags: [['Google Calendar', 'green']], 
              count: clientData.calendarData?.upcoming?.length || 0,
              action: () => window.location.href = '/meetings'
            }
          ].map((card, i) => (
            <div key={i} className="action-card" onClick={card.action}>
              <div className="ac-left">
                <div className={`ac-icon-wrap ${card.iconClass}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {card.iconClass === 'urgent' && <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>}
                    {card.iconClass === 'blue' && <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>}
                    {card.iconClass === 'green' && <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .08h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>}
                  </svg>
                </div>
                <div className="ac-body">
                  <div className="ac-title">{card.title}</div>
                  <div className="ac-desc">{card.desc}</div>
                  <div className="ac-tags">
                    {card.tags.map(([label, cls], j) => (
                      <span key={j} className={`ac-tag ${cls}`}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ac-right">
                {card.count !== null && <div className={`ac-count ${card.tier}`}>{card.count}</div>}
                <svg className="ac-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── GOOGLE RECOVERY SHEET PREVIEW ─── */}
      <div className="section-block">
        <div className="section-header">
          <div>
            <h2 className="section-title">Google Recovery Sheet</h2>
            <p className="section-sub">Live connection to Google Sheets API values.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Last sync: <strong>{clientData.lastSynced || "Never"}</strong>
            </span>
            <div className="sheet-controls">
              <button className="btn-ghost" onClick={() => syncData(true)} disabled={syncing}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>

        {hasError ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
              This workspace does not have an active Recovery Sheet linked. Provide a spreadsheet ID in Settings to synchronize Google Sheets data.
            </p>
            <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => window.location.href = '/settings'}>
              Open Settings
            </button>
          </div>
        ) : (
          <div className="sheet-widget">
            <div className="sheet-widget-header">
              <div className="sheet-status-row">
                <div className="sheet-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="4" fill="#0F9D58"/>
                    <rect x="4" y="6" width="16" height="12" rx="1" fill="rgba(255,255,255,0.15)"/>
                    <path d="M4 9h16M4 12h16M4 15h16M8 6v12M12 6v12M16 6v12" stroke="white" strokeWidth="0.8" opacity="0.6"/>
                  </svg>
                </div>
                <div>
                  <div className="sheet-name">{clientData.sheetName}</div>
                  <div className="sheet-meta-row">
                    <span className="sheet-badge connected"><span className="sheet-badge-dot"/>Connected</span>
                    <span className="sheet-meta-item">Rows: <strong>{clientData.rows}</strong></span>
                    <span className="sheet-meta-item">Leads: <strong>{clientData.opp}</strong></span>
                  </div>
                </div>
              </div>
              <div className="ai-badge-sm">✦ Google Sheets API Sync</div>
            </div>
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th className="sheet-th-check"><input type="checkbox" className="sheet-checkbox" /></th>
                    <th>Lead</th><th>Company</th><th>Proposal Value</th>
                    <th>Last Contact</th><th>Recovery Score</th>
                    <th>Status</th><th>Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.slice(0, 8).map(lead => (
                    <tr key={lead.id}>
                      <td className="sheet-th-check"><input type="checkbox" className="sheet-checkbox" /></td>
                      <td className="sheet-cell-lead">{lead.name}</td>
                      <td>{lead.company}</td>
                      <td className="sheet-cell-value">{lead.val}</td>
                      <td>{lead.contact}</td>
                      <td><span className="sheet-cell-prob">{lead.score}%</span></td>
                      <td><span className={`sheet-cell-score ${lead.tier}`}>{lead.tier.toUpperCase()}</span></td>
                      <td><span className="sheet-cell-action" style={{ cursor: 'pointer' }} onClick={() => openEmailForLead(lead)}>{lead.action}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sheet-footer">
              <span className="sheet-footer-text">Showing {filteredLeads.slice(0, 8).length} of <strong>{clientData.opp}</strong> rows · Sorted by spreadsheet indices</span>
              <button className="sheet-footer-btn" onClick={() => window.location.href = '/sheet'}>View all rows →</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
