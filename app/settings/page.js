'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useSession, signOut } from 'next-auth/react';

export default function SettingsPage() {
  const { showToast, workspace, updateSpreadsheetId } = useApp();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === 'Owner';

  const [activeSection, setActiveSection] = useState('general');
  
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [agencyName, setAgencyName] = useState('Internal System');
  const [opsEmail, setOpsEmail] = useState('ops@internalsystem.local');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [sendWindow, setSendWindow] = useState('9 AM – 5 PM');

  const [aiModel, setAiModel] = useState('Gemini 1.5 Pro');
  const [emailTone, setEmailTone] = useState('Curiosity-first');
  const [autoApprove, setAutoApprove] = useState(false);
  const [logDecisions, setLogDecisions] = useState(true);

  const [slackReply, setSlackReply] = useState(true);
  const [slackMeeting, setSlackMeeting] = useState(true);
  const [emailDaily, setEmailDaily] = useState(false);

  const [saved, setSaved] = useState(false);

  // Sync spreadsheet input from workspace record
  useEffect(() => {
    setSheetIdInput(workspace?.spreadsheetId || '');
  }, [workspace?.spreadsheetId]);

  const handleReconnectGoogle = async () => {
    if (!confirm('Are you sure you want to reconnect Google Services? This will clear the workspace connection and log you out so you can sign in and approve the updated scopes.')) {
      return;
    }
    try {
      const res = await fetch('/api/google/reconnect', { method: 'POST' });
      if (res.ok) {
        showToast('🔄 Google tokens cleared. Redirecting to login...', 'success');
        setTimeout(() => {
          signOut({ callbackUrl: '/login' });
        }, 1500);
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error || 'Failed to clear tokens'}`, 'primary');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error reconnecting Google', 'primary');
    }
  };

  const handleSave = async () => {
    setSaved(true);
    await updateSpreadsheetId(sheetIdInput);
    showToast('✅ Configuration saved successfully', 'success');
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'ai', label: 'AI Settings', icon: '✦' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
  ];

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Configure workspace: {workspace?.name || 'Loading…'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px' }}>
        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sections.map(s => (
            <button
              key={s.id}
              className={`nav-item ${activeSection === s.id ? 'active' : ''}`}
              style={{ cursor: 'pointer', border: 'none', textAlign: 'left', background: 'none', width: '100%' }}
              onClick={() => setActiveSection(s.id)}
            >
              <span style={{ marginRight: '6px' }}>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sections.find(s => s.id === activeSection)?.icon} {sections.find(s => s.id === activeSection)?.label}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeSection === 'general' && (
              <>
                {/* Spreadsheet ID config */}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                    Google Sheets Recovery Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={e => setSheetIdInput(e.target.value)}
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                    disabled={!isOwner}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', fontFamily: 'var(--font)', opacity: isOwner ? 1 : 0.5, cursor: isOwner ? 'text' : 'not-allowed' }}
                  />
                  <small style={{ color: 'var(--text-3)', fontSize: '10.5px', marginTop: '4px', display: 'block' }}>
                    {isOwner
                      ? 'This sheet is the single source of truth for all workspace data.'
                      : 'Only the Workspace Owner can change the connected spreadsheet.'}
                  </small>
                </div>

                <div style={{
                  padding: '16px',
                  background: 'var(--bg-card-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  marginTop: '6px',
                  marginBottom: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Google Account Integration</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                        Status: <span style={{ color: workspace?.googleConnected ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {workspace?.googleConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        onClick={handleReconnectGoogle}
                        className="btn-ghost"
                        style={{ fontSize: '11.5px', padding: '6px 12px', borderColor: 'var(--border)' }}
                      >
                        Reconnect Account
                      </button>
                    )}
                  </div>
                  <small style={{ color: 'var(--text-3)', fontSize: '10px', marginTop: '8px', display: 'block', lineHeight: 1.4 }}>
                    All members of the workspace share this Google connection. If you experience authentication or scope errors with Sheets, Gmail, or Calendar, click "Reconnect Account" to log out and grant all scopes.
                  </small>
                </div>


                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Agency Name</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={e => setAgencyName(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', fontFamily: 'var(--font)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Ops Email</label>
                  <input
                    type="email"
                    value={opsEmail}
                    onChange={e => setOpsEmail(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', fontFamily: 'var(--font)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {['Asia/Kolkata', 'America/New_York', 'Europe/London', 'UTC'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Send Window</label>
                  <select
                    value={sendWindow}
                    onChange={e => setSendWindow(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {['9 AM – 5 PM', '8 AM – 6 PM', '7 AM – 8 PM', 'Any time'].map(sw => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                </div>
              </>
            )}

            {activeSection === 'ai' && (
              <>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>AI Model</label>
                  <select
                    value={aiModel}
                    onChange={e => setAiModel(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {['Gemini 1.5 Pro', 'GPT-4 Turbo', 'Claude 3.5'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, display: 'block', marginBottom: '5px' }}>Email Tone</label>
                  <select
                    value={emailTone}
                    onChange={e => setEmailTone(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {['Curiosity-first', 'Professional', 'Casual', 'Direct'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>Auto-Approve Emails ≥ 90% score</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autoApprove} onChange={() => setAutoApprove(!autoApprove)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                    <span style={{ position: 'absolute', inset: 0, background: autoApprove ? 'var(--violet)' : 'rgba(255,255,255,.1)', borderRadius: '20px', transition: 'all .2s', border: '1px solid var(--border)' }}>
                      <span style={{ position: 'absolute', top: '2px', left: autoApprove ? '18px' : '2px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>Log AI Decisions</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={logDecisions} onChange={() => setLogDecisions(!logDecisions)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                    <span style={{ position: 'absolute', inset: 0, background: logDecisions ? 'var(--violet)' : 'rgba(255,255,255,.1)', borderRadius: '20px', transition: 'all .2s', border: '1px solid var(--border)' }}>
                      <span style={{ position: 'absolute', top: '2px', left: logDecisions ? '18px' : '2px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                    </span>
                  </label>
                </div>
              </>
            )}

            {activeSection === 'notifications' && (
              <>
                {[
                  { label: 'Slack alert on new reply', val: slackReply, setVal: setSlackReply },
                  { label: 'Slack alert on meeting booked', val: slackMeeting, setVal: setSlackMeeting },
                  { label: 'Daily digest email', val: emailDaily, setVal: setEmailDaily }
                ].map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text)' }}>{f.label}</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={f.val} onChange={() => f.setVal(!f.val)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                      <span style={{ position: 'absolute', inset: 0, background: f.val ? 'var(--violet)' : 'rgba(255,255,255,.1)', borderRadius: '20px', transition: 'all .2s', border: '1px solid var(--border)' }}>
                        <span style={{ position: 'absolute', top: '2px', left: f.val ? '18px' : '2px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                      </span>
                    </label>
                  </div>
                ))}
              </>
            )}

            {activeSection === 'danger' && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--red)' }}>Reset client data</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Wipe all recovery data for the active client. Cannot be undone.</div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ borderColor: 'rgba(239,68,68,.3)', color: 'var(--red)' }}
                  onClick={() => showToast('⚠️ Reset operation is protected — contact administrator', 'primary')}
                >
                  Reset…
                </button>
              </div>
            )}
          </div>

          {activeSection !== 'danger' && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-ghost" onClick={() => showToast('Changes discarded', 'primary')}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{saved ? 'Saved' : 'Save Settings'}</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
