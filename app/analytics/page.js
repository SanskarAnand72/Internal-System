'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

// Mini SVG bar chart component
function BarChart({ data, color = 'var(--violet)', height = 80 }) {
  const max = Math.max(...data.map(d => d.val));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${height}px` }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
          <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: color, opacity: .85, height: `${(d.val / max) * (height - 16)}px`, transition: 'height .8s ease', minHeight: '2px' }} />
          <div style={{ fontSize: '9px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// Mini SVG line chart
function LineChart({ data, color = 'var(--violet)', height = 80 }) {
  const max = Math.max(...data.map(d => d.val));
  const min = Math.min(...data.map(d => d.val));
  const w = 240, h = height;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((d.val - min) / (max - min || 1)) * (h - 10) - 5,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: `${h}px` }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity=".01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  );
}

// Funnel component
function Funnel({ stages }) {
  const max = stages[0].val;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {stages.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '10.5px', color: 'var(--text-3)', width: '100px', flexShrink: 0, textAlign: 'right' }}>{s.label}</div>
          <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,.03)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: s.color || 'var(--violet)', opacity: .2, width: `${(s.val / max) * 100}%`, borderRadius: '4px', transition: 'width 1s ease' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>{s.val}</div>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', width: '36px', flexShrink: 0 }}>{Math.round(s.val / max * 100)}%</div>
        </div>
      ))}
    </div>
  );
}

const MONTHLY = [
  { label: 'Jan', val: 41 }, { label: 'Feb', val: 58 }, { label: 'Mar', val: 72 }, { label: 'Apr', val: 65 },
  { label: 'May', val: 89 }, { label: 'Jun', val: 103 }, { label: 'Jul', val: 128 },
];

const REVENUE_TREND = [
  { label: 'W1', val: 24000 }, { label: 'W2', val: 31000 }, { label: 'W3', val: 28000 },
  { label: 'W4', val: 45000 }, { label: 'W5', val: 52000 }, { label: 'W6', val: 67000 }, { label: 'W7', val: 82000 },
];

const FUNNEL = [
  { label: 'Proposals Audited', val: 148, color: 'var(--violet)' },
  { label: 'Emails Sent', val: 81, color: 'var(--violet)' },
  { label: 'Opened', val: 53, color: 'var(--amber)' },
  { label: 'Replied', val: 17, color: 'var(--green)' },
  { label: 'Meetings Booked', val: 8, color: 'var(--green)' },
  { label: 'Revenue Recovered', val: 3, color: 'var(--green)' },
];

export default function AnalyticsPage() {
  const { selectedClient, clientData } = useApp();
  const [range, setRange] = useState('30d');

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Analytics</h1>
        <p className="page-sub">Revenue recovery performance for {selectedClient}</p>
      </div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {['7d', '30d', '90d', 'All'].map(r => (
          <button key={r} className={`filter-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="analytics-top-row">
        {[
          { label: 'Revenue Recovered', value: `$${(clientData.rev / 1000).toFixed(0)}K`, change: '+28% vs last month', up: true, green: true },
          { label: 'Total Emails Sent', value: '81', change: '+12 this week', up: true },
          { label: 'Overall Reply Rate', value: '21%', change: '+4% vs avg', up: true },
          { label: 'Meetings Booked', value: '8', change: '+3 this week', up: true },
          { label: 'Avg. Recovery Time', value: '11d', change: '-2d faster', up: true },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className={`kpi-value ${k.green ? 'green' : ''}`}>{k.value}</div>
            <div className={`kpi-change ${k.up ? 'up' : 'down'}`}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="analytics-charts-row" style={{ marginTop: '16px' }}>
        {/* Revenue trend */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Revenue Recovered — Weekly</div>
            <div className="ai-badge-sm">✦ AI Insight</div>
          </div>
          <LineChart data={REVENUE_TREND} color="var(--green)" height={90} />
          <div style={{ marginTop: '6px', fontSize: '10.5px', color: 'var(--text-3)' }}>Trend: <span style={{ color: 'var(--green)', fontWeight: 700 }}>+28% MoM</span></div>
        </div>

        {/* Emails sent */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Emails Sent — Monthly</div>
          </div>
          <BarChart data={MONTHLY} color="var(--violet)" height={90} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="analytics-charts-row" style={{ marginTop: '12px' }}>
        {/* Funnel */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Recovery Funnel</div>
            <div className="ai-badge-sm">✦ Full Pipeline</div>
          </div>
          <Funnel stages={FUNNEL} />
        </div>

        {/* Reply rate by tier */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Reply Rate by Lead Tier</div>
          </div>
          <BarChart
            data={[
              { label: 'HIGH', val: 34 },
              { label: 'MED', val: 18 },
              { label: 'LOW', val: 6 },
            ]}
            color="var(--amber)"
            height={90}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {[['HIGH', '34%', 'var(--red)'], ['MEDIUM', '18%', 'var(--violet)'], ['LOW/DEAD', '6%', 'var(--grey)']].map(([t, v, c]) => (
              <div key={t} style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                <span style={{ color: c, fontWeight: 700 }}>{v}</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top performers */}
      <div className="section-block">
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <h2 className="section-title">Top Recovery Performers</h2>
        </div>
        <div className="sheet-widget">
          <div className="sheet-table-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Recovery Score</th>
                  <th>Emails Sent</th>
                  <th>Replies</th>
                  <th>Status</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {clientData.leads.filter(l => l.tier === 'high' || l.tier === 'medium').map(l => (
                  <tr key={l.id}>
                    <td className="sheet-cell-lead">{l.company}</td>
                    <td><span className="sheet-cell-prob">{l.score}%</span></td>
                    <td>2</td>
                    <td><span style={{ color: l.tier === 'high' ? 'var(--green)' : 'var(--text-3)', fontWeight: 600 }}>{l.tier === 'high' ? 1 : 0}</span></td>
                    <td><span className={`sheet-cell-score ${l.tier}`}>{l.tier.toUpperCase()}</span></td>
                    <td className="sheet-cell-value">{l.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
