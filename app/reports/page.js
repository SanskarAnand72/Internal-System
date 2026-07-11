'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

const REPORTS = [
  { id: 1, name: 'Q3 Recovery Summary', type: 'Monthly', date: 'Jul 8, 2025', size: '48 KB', status: 'ready' },
  { id: 2, name: 'Campaign Performance Report', type: 'Campaign', date: 'Jul 5, 2025', size: '32 KB', status: 'ready' },
  { id: 3, name: 'Lead Scoring Analysis', type: 'AI Audit', date: 'Jul 1, 2025', size: '56 KB', status: 'ready' },
  { id: 4, name: 'June Recovery Outcomes', type: 'Monthly', date: 'Jun 30, 2025', size: '44 KB', status: 'ready' },
  { id: 5, name: 'Client Proposal Funnel', type: 'Funnel', date: 'Jun 20, 2025', size: '28 KB', status: 'generating' },
];

export default function ReportsPage() {
  const { selectedClient, showToast } = useApp();
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    showToast('✦ Generating AI report…', 'primary');
    setTimeout(() => { setGenerating(false); showToast('✅ Report generated and ready to download', 'success'); }, 2000);
  };

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Reports</h1>
        <p className="page-sub">AI-generated recovery reports for {selectedClient}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="ai-badge-sm">✦ {REPORTS.length} reports generated</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-ghost" onClick={() => showToast('📊 Scheduling weekly report…', 'primary')}>Schedule</button>
          <button className="btn-primary" onClick={generate} disabled={generating}>
            {generating ? '✦ Generating…' : '✦ Generate Report'}
          </button>
        </div>
      </div>

      <div className="sheet-widget">
        <div className="sheet-table-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Generated</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {REPORTS.map(r => (
                <tr key={r.id}>
                  <td className="sheet-cell-lead">{r.name}</td>
                  <td>
                    <span className="ac-tag">{r.type}</span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-2)' }}>{r.date}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>{r.size}</td>
                  <td>
                    {r.status === 'ready' ? (
                      <span className="int-status connected">Ready</span>
                    ) : (
                      <span className="int-status running" style={{ animation: 'pulse .8s ease-in-out infinite' }}>Generating…</span>
                    )}
                  </td>
                  <td>
                    <div className="q-action-btns">
                      <button className="q-btn generate" onClick={() => showToast(`📊 Opening ${r.name}`, 'primary')}>View</button>
                      <button className="q-btn approve" onClick={() => showToast(`⬇️ Downloading ${r.name}`, 'success')}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
