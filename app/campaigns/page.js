'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

const CAMPAIGNS = [
  { id: 1, name: 'High Priority — Q3 Recovery', status: 'running', sent: 18, opens: 11, replies: 4, revenue: '$241,000', rate: '22%', started: 'Jul 8', target: 18, progress: 72 },
  { id: 2, name: 'Medium — Long Stalled', status: 'running', sent: 31, opens: 19, replies: 7, revenue: '$128,500', rate: '15%', started: 'Jul 6', target: 31, progress: 58 },
  { id: 3, name: 'Healthcare Vertical', status: 'paused', sent: 12, opens: 6, replies: 2, revenue: '$84,200', rate: '18%', started: 'Jun 30', target: 20, progress: 40 },
  { id: 4, name: 'At-Risk — 60+ Days', status: 'paused', sent: 9, opens: 3, replies: 1, revenue: '$56,000', rate: '9%', started: 'Jun 28', target: 9, progress: 100 },
];

export default function CampaignsPage() {
  const { selectedClient, showToast } = useApp();
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);

  const toggleStatus = (id) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newStatus = c.status === 'running' ? 'paused' : 'running';
      showToast(`Campaign ${newStatus === 'running' ? '▶️ resumed' : '⏸ paused'}`, newStatus === 'running' ? 'success' : 'primary');
      return { ...c, status: newStatus };
    }));
  };

  const totalRevenue = campaigns.reduce((sum, c) => {
    const val = parseInt(c.revenue.replace(/[$K,]/g, '')) * (c.revenue.includes('K') ? 1000 : 1);
    return sum + val;
  }, 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + c.replies, 0);
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Campaigns</h1>
        <p className="page-sub">Recovery campaign performance for {selectedClient}</p>
      </div>

      {/* Summary KPIs */}
      <div className="analytics-top-row" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Campaigns Active', value: campaigns.filter(c => c.status === 'running').length.toString(), change: '' },
          { label: 'Total Emails Sent', value: totalSent.toString(), change: '+12 today', up: true },
          { label: 'Total Replies', value: totalReplies.toString(), change: '+2 today', up: true },
          { label: 'Reply Rate', value: `${Math.round(totalReplies / totalSent * 100)}%`, change: 'avg', up: true },
          { label: 'Pipeline Influenced', value: `$${(totalRevenue / 1000).toFixed(0)}K`, change: 'cumulative', up: true, green: true },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.green ? 'green' : ''}`}>{k.value}</div>
            {k.change && <div className={`kpi-change ${k.up ? 'up' : ''}`}>{k.change}</div>}
          </div>
        ))}
      </div>

      {/* Campaign Cards */}
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <div>
          <h2 className="section-title">All Campaigns</h2>
          <p className="section-sub">{campaigns.length} campaigns across {selectedClient}</p>
        </div>
        <button className="btn-primary" onClick={() => showToast('🚀 New campaign creation opened', 'primary')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Campaign
        </button>
      </div>

      <div className="campaigns-grid">
        {campaigns.map(c => (
          <div key={c.id} className="campaign-card">
            <div>
              <div className="campaign-header">
                <div className="campaign-name">{c.name}</div>
                <div className={`campaign-status ${c.status}`}>
                  <span className="sheet-badge-dot" />
                  {c.status}
                </div>
              </div>
              <div className="campaign-progress-label">
                <span>Progress</span>
                <span>{c.progress}%</span>
              </div>
              <div className="campaign-progress-bar">
                <div className="campaign-progress-fill" style={{ width: `${c.progress}%` }} />
              </div>
              <div className="campaign-metrics">
                {[['Sent', c.sent], ['Opens', c.opens], ['Replies', c.replies]].map(([l, v]) => (
                  <div key={l}>
                    <div className="c-metric-val">{v}</div>
                    <div className="c-metric-label">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="campaign-footer">
                <div>
                  <div className="campaign-revenue">{c.revenue}</div>
                  <div className="campaign-rate">{c.rate} reply rate · Started {c.started}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="q-btn generate" onClick={() => showToast(`📊 Viewing ${c.name}`, 'primary')}>View</button>
                  <button
                    className={`q-btn ${c.status === 'running' ? 'skip' : 'approve'}`}
                    onClick={() => toggleStatus(c.id)}
                  >
                    {c.status === 'running' ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
