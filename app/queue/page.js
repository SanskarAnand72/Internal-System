'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

// Lead Detail Drawer
function LeadDrawer({ lead, onClose, onApprove }) {
  const { showToast, setEmailModalData } = useApp();
  if (!lead) return null;

  const emailBody = `Hi ${lead.name.split(' ')[0]},\n\nI wanted to personally follow up on the proposal we sent over for ${lead.company}.\n\nBased on Q3 close rates in your sector, there is an optimal window open right now.\n\nWould a quick 15-minute call make sense this week?\n\nBest,\nSanskar Kulkarni`;

  const timeline = [
    { icon: '📧', label: 'Email Generated', time: 'Just now', color: 'blue' },
    { icon: '📨', label: 'Initial Outreach', time: lead.contact, color: 'grey' }
  ];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{lead.company}</div>
            <div className="drawer-sub">{lead.name} · {lead.val} · {lead.score}% recovery probability</div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          {/* Score & Tier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Recovery Score', value: `${lead.score}%`, color: 'var(--green)' },
              { label: 'Tier', value: lead.tier.toUpperCase(), color: lead.tier === 'high' ? 'var(--red)' : lead.tier === 'medium' ? 'var(--violet)' : 'var(--grey)' },
              { label: 'Proposal Value', value: lead.val, color: 'var(--text)' },
            ].map(m => (
              <div key={m.label} className="q-metric">
                <div className="q-metric-label">{m.label}</div>
                <div className="q-metric-value" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* AI Reasoning */}
          <div style={{ marginBottom: '16px' }}>
            <div className="ai-section-label" style={{ marginTop: 0 }}>AI Reasoning</div>
            <div className="q-reason" style={{ marginBottom: 0 }}>
              <div className="q-reason-icon">✦</div>
              <div>Recovery probability is mapped at <strong>{lead.score}%</strong>. Historical response curves match Q3 timeline patterns. Suggested action: <strong>{lead.action}</strong>.</div>
            </div>
          </div>

          {/* Generated Email Preview */}
          <div style={{ marginBottom: '16px' }}>
            <div className="ai-section-label" style={{ marginTop: 0 }}>Generated Recovery Email</div>
            <div className="preview-email-box">
              <div className="preview-field"><span>To:</span> {lead.name} &lt;{lead.name.toLowerCase().replace(' ', '.')}@{lead.company.toLowerCase().replace(/\s+/g, '')}.com&gt;</div>
              <div className="preview-field"><span>Subject:</span> Quick thought on the project we shelved last quarter</div>
              <div className="preview-divider" />
              <div className="preview-body-text" style={{ whiteSpace: 'pre-wrap', fontSize: '11.5px', lineHeight: '1.6' }}>{emailBody}</div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="ai-section-label" style={{ marginTop: 0 }}>Activity Timeline</div>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '24px', height: '24px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>{t.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn-ghost" onClick={() => { showToast('🚀 Lead archived', 'success'); onClose(); }}>Archive Lead</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => {
              setEmailModalData({
                company: lead.company,
                to: `${lead.name.toLowerCase().replace(' ', '.')}@${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
                subject: "Quick thought on the project we shelved last quarter",
                body: emailBody,
                reason: "Google Sheets row sync trigger"
              });
              onClose();
            }}>Preview Email</button>
            <button className="btn-primary" onClick={() => { showToast(`✅ Outreach queued for ${lead.company}`, 'success'); onClose(); }}>
              Queue Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { clientData, selectedClient, showToast, setEmailModalData } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [sortBy, setSortBy] = useState('score');

  const hasError = !!clientData.sheetsError;
  const leads = clientData.leads;
  const filtered = activeFilter === 'all' ? leads : leads.filter(l => l.tier === activeFilter);
  const sorted = [...filtered].sort((a, b) => sortBy === 'score' ? b.score - a.score : a.company.localeCompare(b.company));

  const counts = {
    all: leads.length,
    high: leads.filter(l => l.tier === 'high').length,
    medium: leads.filter(l => l.tier === 'medium').length,
    low: leads.filter(l => l.tier === 'low' || l.tier === 'dead').length,
  };

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Recovery Queue</h1>
        <p className="page-sub">
          {hasError ? "No active data connection" : `${clientData.opp} opportunities from ${selectedClient}`}
        </p>
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
          <div style={{ fontSize: '32px' }}>🎯</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
            Configure a valid Google Sheets Spreadsheet ID in settings to populate the recovery queue.
          </p>
          <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </button>
        </div>
      ) : (
        <>
          {/* Filters + Sort */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="queue-filters">
              {[['all','All',counts.all,''],['high','High',counts.high,'red'],['medium','Medium',counts.medium,'blue'],['low','At Risk',counts.low,'grey']].map(([key, label, count, dot]) => (
                <button key={key} className={`filter-btn ${activeFilter === key ? 'active' : ''}`} onClick={() => setActiveFilter(key)}>
                  {dot && <span className={`filter-dot ${dot}`} />}
                  {label} <span className="filter-count" style={{ opacity: .6, fontSize: '10px' }}>{count}</span>
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="score">Sort by Score</option>
              <option value="company">Sort by Company</option>
            </select>
          </div>

          {/* Lead Table */}
          <div className="sheet-widget">
            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th className="sheet-th-check"><input type="checkbox" className="sheet-checkbox" /></th>
                    <th>Lead</th>
                    <th>Company</th>
                    <th>Proposal Value</th>
                    <th>Score</th>
                    <th>Last Contact</th>
                    <th>Email Status</th>
                    <th>Next Action</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(lead => (
                    <tr key={lead.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                      <td className="sheet-th-check" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="sheet-checkbox" />
                      </td>
                      <td className="sheet-cell-lead">{lead.name}</td>
                      <td>{lead.company}</td>
                      <td className="sheet-cell-value">{lead.val}</td>
                      <td>
                        <span className="sheet-cell-prob">{lead.score}%</span>
                        {' '}
                        <span className={`sheet-cell-score ${lead.tier}`}>{lead.tier.toUpperCase()}</span>
                      </td>
                      <td>{lead.contact}</td>
                      <td><span className="sheet-cell-status">{lead.status}</span></td>
                      <td><span className="sheet-cell-action">{lead.action}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="q-action-btns">
                          <button className="q-btn generate" onClick={() => {
                            setEmailModalData({
                              company: lead.company,
                              to: `${lead.name.toLowerCase().replace(' ', '.')}@${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
                              subject: "Quick thought on the project we shelved last quarter",
                              body: `Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up on our proposal. Let me know if you have time for a brief 15-minute call.\n\nBest,\nSanskar`,
                              reason: "Google Sheets row sync outreach"
                            });
                          }}>Email</button>
                          <button className="q-btn approve" onClick={() => showToast(`✅ ${lead.company} queued for outreach`, 'success')}>Queue</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sheet-footer">
              <span className="sheet-footer-text">Showing <strong>{sorted.length}</strong> of <strong>{clientData.opp}</strong> leads</span>
            </div>
          </div>
        </>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
