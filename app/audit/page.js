'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

const STAGES = [
  { id: 'upload', label: 'Sheet Imported', icon: '📊', count: null },
  { id: 'parse', label: 'Data Parsed', icon: '🗂️', count: null },
  { id: 'audit', label: 'AI Audit', icon: '✦', count: null },
  { id: 'score', label: 'Scored', icon: '🎯', count: null },
  { id: 'emails', label: 'Emails Written', icon: '✉️', count: null },
  { id: 'approved', label: 'Approved', icon: '✅', count: null },
  { id: 'launched', label: 'Launched', icon: '🚀', count: null },
];

export default function AIAuditPage() {
  const { clientData, selectedClient, showToast } = useApp();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ stage: 4 });
  const [filter, setFilter] = useState('all');

  const hasError = !!clientData.sheetsError;
  const leads = clientData.leads;
  const filtered = filter === 'all' ? leads : leads.filter(l => l.tier === filter);

  const handleReaudit = () => {
    if (hasError) {
      showToast('⚠️ No Sheet connected to audit', 'primary');
      return;
    }
    setRunning(true);
    showToast('✦ Re-audit started for all rows…', 'primary');
    setTimeout(() => { setRunning(false); showToast('✅ Audit complete — scores updated', 'success'); }, 2000);
  };

  const tierCounts = {
    high: leads.filter(l => l.tier === 'high').length,
    medium: leads.filter(l => l.tier === 'medium').length,
    low: leads.filter(l => l.tier === 'low' || l.tier === 'dead').length
  };

  const stagesWithCounts = STAGES.map((s, i) => ({
    ...s,
    count: i < progress.stage ? (i === 3 ? clientData.opp : clientData.rows) : null
  }));

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">AI Audit</h1>
        <p className="page-sub">Intelligent opportunity scoring — {selectedClient}</p>
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
          <div style={{ fontSize: '32px' }}>✦</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
            Configure a valid Google Sheets Spreadsheet ID in settings to run AI Audits.
          </p>
          <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </button>
        </div>
      ) : (
        <>
          {/* Audit Pipeline Flow */}
          <div className="section-block" style={{ marginTop: 0 }}>
            <div className="section-header">
              <div>
                <h2 className="section-title">Audit Pipeline</h2>
                <p className="section-sub">Current processing status</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {running && <div className="ai-badge-sm" style={{ animation: 'pulse .8s ease-in-out infinite' }}>✦ Processing…</div>}
                <button className="btn-primary" onClick={handleReaudit} disabled={running}>
                  {running ? 'Running…' : 'Re-Audit All Rows'}
                </button>
              </div>
            </div>

            <div className="audit-flow">
              {stagesWithCounts.map((stage, i) => (
                <React.Fragment key={stage.id}>
                  <div className={`af-node ${i < progress.stage ? 'done' : i === progress.stage ? 'active' : ''}`}>
                    <div className="af-icon-circle">{stage.icon}</div>
                    <div className="af-label">{stage.label}</div>
                    {stage.count && <div className="af-count">{stage.count.toLocaleString()}</div>}
                  </div>
                  {i < STAGES.length - 1 && <div className={`af-connector ${i < progress.stage ? 'done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="section-block">
            <div className="section-header">
              <h2 className="section-title">Score Distribution</h2>
              <div className="ai-badge-sm">✦ AI Model Mapped</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '8px' }}>
              {[
                { tier: 'HIGH', count: tierCounts.high, desc: '85%+ recovery probability — immediate action required', color: 'var(--red)', bg: 'rgba(239,68,68,.08)' },
                { tier: 'MEDIUM', count: tierCounts.medium, desc: '55–84% recovery probability — queue for follow-up', color: 'var(--violet)', bg: 'rgba(99,102,241,.08)' },
                { tier: 'DEAD', count: tierCounts.low, desc: 'Below 55% — archive or low-touch nurture', color: 'var(--grey)', bg: 'rgba(113,113,122,.08)' },
              ].map(t => (
                <div key={t.tier} className="kpi-card" style={{ background: t.bg, borderColor: `${t.color}22` }}>
                  <div className="kpi-label">{t.tier} Priority</div>
                  <div className="kpi-value" style={{ color: t.color }}>{t.count}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '6px', lineHeight: '1.4' }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Scores Table */}
          <div className="section-block">
            <div className="section-header">
              <div>
                <h2 className="section-title">Scored Opportunities</h2>
              </div>
              <div className="queue-filters">
                {['all','high','medium','low'].map(f => (
                  <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                    {f.toUpperCase() === 'LOW' ? 'DEAD' : f.toUpperCase() === 'ALL' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="sheet-widget">
              <div className="sheet-table-wrap">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Lead</th>
                      <th>Proposal Value</th>
                      <th>Recovery Score</th>
                      <th>Tier</th>
                      <th>AI Reasoning</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(lead => (
                      <tr key={lead.id}>
                        <td className="sheet-cell-lead">{lead.company}</td>
                        <td>{lead.name}</td>
                        <td className="sheet-cell-value">{lead.val}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '48px', height: '4px', background: 'rgba(255,255,255,.05)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${lead.score}%`, height: '100%', background: lead.tier === 'high' ? 'var(--red)' : lead.tier === 'medium' ? 'var(--violet)' : 'var(--grey)', transition: 'width 1s ease' }} />
                            </div>
                            <span className="sheet-cell-prob">{lead.score}%</span>
                          </div>
                        </td>
                        <td><span className={`sheet-cell-score ${lead.tier}`}>{lead.tier.toUpperCase()}</span></td>
                        <td style={{ fontSize: '11px', color: 'var(--text-2)' }}>Scope alignment curve, last touch {lead.contact}</td>
                        <td>
                          <button className="q-btn generate" onClick={() => showToast(`✦ Re-scoring ${lead.company}…`, 'primary')}>Re-Score</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
