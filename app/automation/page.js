'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

const INTEGRATIONS = [
  { id: 'sheets', name: 'Google Sheets', icon: '📊', status: 'connected', meta: 'Recovery Sheet synced 2m ago', health: '99.9% uptime', lastSync: '2 min ago' },
  { id: 'gmail', name: 'Gmail / Brevo', icon: '✉️', status: 'connected', meta: 'SMTP active · 18 emails queued', health: '99.7% uptime', lastSync: '5 min ago' },
  { id: 'n8n', name: 'n8n Automation', icon: '⚙️', status: 'running', meta: '3 workflows running', health: '100% uptime', lastSync: 'Live' },
  { id: 'openai', name: 'OpenAI API', icon: '✦', status: 'connected', meta: 'Gemini Pro · 48 completions today', health: '99.9% uptime', lastSync: '1 min ago' },
  { id: 'slack', name: 'Slack Notifications', icon: '💬', status: 'connected', meta: '#internal-ops channel', health: '100% uptime', lastSync: '10 min ago' },
  { id: 'calendar', name: 'Google Calendar', icon: '📅', status: 'connected', meta: '4 meetings synced', health: '99.8% uptime', lastSync: '15 min ago' },
  { id: 'calling', name: 'Calling (Aircall)', icon: '📞', status: 'disconnected', meta: 'Not connected — click to configure', health: '—', lastSync: '—' },
  { id: 'hubspot', name: 'HubSpot CRM', icon: '🔵', status: 'disconnected', meta: 'Optional — CRM sync', health: '—', lastSync: '—' },
];

const WORKFLOWS = [
  { id: 1, name: 'Recovery Email → Approval → Send', status: 'running', runs: 342, success: 338, lastRun: '2 min ago' },
  { id: 2, name: 'Reply Detected → AI Categorize → Slack Alert', status: 'running', runs: 156, success: 155, lastRun: '8 min ago' },
  { id: 3, name: 'Meeting Booked → Calendar → Prep Notes', status: 'running', runs: 41, success: 41, lastRun: '1 hr ago' },
  { id: 4, name: 'Lead Goes Cold → Re-score → Flag', status: 'paused', runs: 89, success: 81, lastRun: '2 days ago' },
];

export default function AutomationPage() {
  const { selectedClient, showToast, automationStatus, setAutomationStatus } = useApp();
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggleIntegration = (id) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id !== id) return int;
      if (int.status === 'disconnected') {
        showToast(`🔌 Connecting ${int.name}…`, 'primary');
        return { ...int, status: 'connected', meta: 'Connected successfully' };
      }
      showToast(`⚡ ${int.name} disconnected`, 'primary');
      return { ...int, status: 'disconnected', meta: 'Disconnected — click to reconnect' };
    }));
  };

  const connectedCount = integrations.filter(i => i.status !== 'disconnected').length;

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Automation</h1>
        <p className="page-sub">Integration health and n8n workflow status for {selectedClient}</p>
      </div>

      {/* Master toggle + status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pulse-dot" />
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Automation Engine {automationStatus ? 'Active' : 'Paused'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{connectedCount}/{integrations.length} integrations connected · n8n coordinating all workflows</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="automation-uptime">99.8% uptime</span>
          <button className={`btn-${automationStatus ? 'ghost' : 'primary'}`} onClick={() => { setAutomationStatus(!automationStatus); showToast(automationStatus ? '⏸ Automation paused' : '▶️ Automation resumed', 'primary'); }}>
            {automationStatus ? 'Pause Engine' : 'Resume Engine'}
          </button>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <h2 className="section-title">Integration Status</h2>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{connectedCount} active</span>
      </div>
      <div className="integrations-grid" style={{ marginBottom: '28px' }}>
        {integrations.map(int => (
          <div key={int.id} className="int-card">
            <span className="int-icon">{int.icon}</span>
            <div className="int-name">{int.name}</div>
            <div className="int-meta">{int.meta}</div>
            <div className="int-health">Health: {int.health}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span className={`int-status ${int.status}`}>{int.status}</span>
              <button className="q-btn generate" style={{ fontSize: '9.5px', padding: '2px 6px' }} onClick={() => toggleIntegration(int.id)}>
                {int.status === 'disconnected' ? 'Connect' : 'Settings'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* n8n Workflows */}
      <div className="section-header" style={{ marginBottom: '12px' }}>
        <h2 className="section-title">n8n Workflows</h2>
        <button className="btn-ghost" onClick={() => showToast('⚙️ Opening n8n editor…', 'primary')}>Open n8n →</button>
      </div>
      <div className="sheet-widget">
        <div className="sheet-table-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Status</th>
                <th>Total Runs</th>
                <th>Success Rate</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOWS.map(w => (
                <tr key={w.id}>
                  <td className="sheet-cell-lead">{w.name}</td>
                  <td>
                    <span className={`int-status ${w.status === 'running' ? 'running' : 'disconnected'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{w.runs.toLocaleString()}</td>
                  <td>
                    <span style={{ color: w.success / w.runs > .95 ? 'var(--green)' : 'var(--amber)', fontWeight: 700, fontSize: '12px' }}>
                      {Math.round(w.success / w.runs * 100)}%
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-3)', fontSize: '11px' }}>{w.lastRun}</td>
                  <td>
                    <div className="q-action-btns">
                      <button className="q-btn generate" onClick={() => showToast(`📊 Viewing ${w.name}`, 'primary')}>Logs</button>
                      <button className={`q-btn ${w.status === 'running' ? 'skip' : 'approve'}`} onClick={() => showToast(`${w.status === 'running' ? 'Paused' : 'Resumed'} workflow`, 'success')}>
                        {w.status === 'running' ? 'Pause' : 'Resume'}
                      </button>
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
