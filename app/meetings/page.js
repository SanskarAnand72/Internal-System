'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function MeetingsPage() {
  const { clientData, selectedClient, showToast, syncing, syncData } = useApp();
  const [view, setView] = useState('upcoming');

  const hasError = !!clientData.calendarError;
  const calendar = clientData.calendarData || { upcoming: [], completed: [] };

  const activeEvents = view === 'upcoming' ? calendar.upcoming : calendar.completed;

  // calculate pipeline valuation from events dynamically matching sheets proposal values
  let totalValuation = 0;
  const eventsWithRealValues = activeEvents.map(m => {
    const leadMatch = clientData.leads.find(l => 
      l.company.toLowerCase().includes(m.company.toLowerCase()) || 
      m.company.toLowerCase().includes(l.company.toLowerCase())
    );
    let valString = leadMatch && leadMatch.val ? String(leadMatch.val) : "";
    let cleanVal = parseFloat(valString.replace(/[^0-9.]/g, "")) || 0;
    if (cleanVal === 0) {
      cleanVal = 0;
      valString = "—";
    }
    totalValuation += cleanVal;
    return {
      ...m,
      value: valString
    };
  });


  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Meetings</h1>
        <p className="page-sub">Booked recovery calls for {selectedClient} — synced with Google Calendar API</p>
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
          <div style={{ fontSize: '32px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
            Unable to connect to Google Calendar. Verify that you have signed in with the correct Google account and try again.
          </p>
          <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => syncData(true)} disabled={syncing}>
            {syncing ? 'Connecting…' : 'Sync Calendar'}
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Upcoming',       value: calendar.upcoming.length.toString(), sub: 'next 30 days' },
              { label: 'Confirmed',      value: calendar.upcoming.filter(m => m.status === 'confirmed').length.toString(), sub: 'booked', green: true },
              { label: 'Completed',      value: calendar.completed.length.toString(), sub: 'past 30 days' },
              { label: 'Pipeline Value', value: totalValuation > 0 ? `$${(totalValuation / 1000).toFixed(0)}K` : '—', sub: 'matched from sheet', green: totalValuation > 0 },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-label">{k.label}</div>
                <div className={`kpi-value ${k.green ? 'green' : ''}`}>{k.value}</div>
                <div className="kpi-change">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* View tabs */}
          <div style={{ display: 'flex', justifycontent: 'space-between', alignitems: 'center', marginBottom: '16px' }}>
            <div className="meeting-view-tabs" style={{ flex: 1 }}>
              {['upcoming', 'completed'].map(t => (
                <button key={t} className={`mv-tab ${view === t ? 'active' : ''}`} onClick={() => setView(t)}>
                  {t === 'upcoming' ? 'Upcoming' : 'Completed'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-ghost" onClick={() => syncData(true)} disabled={syncing}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync Calendar'}
              </button>
            </div>
          </div>

          {/* Meetings List */}
          <div className="meetings-grid" style={{ marginTop: '14px' }}>
            {eventsWithRealValues.map(m => (
              <div key={m.id} className="meet-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div className="meet-date-box">
                    <div className="meet-day">{m.day}</div>
                    <div className="meet-month">{m.month}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="meet-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                    <div className="meet-time">{m.time} · {m.duration} · {m.type === 'video' ? '📹' : '📞'} {m.type}</div>
                  </div>
                  <div className="meet-val-badge">{m.value || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: m.status === 'confirmed' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)', color: m.status === 'confirmed' ? 'var(--green)' : 'var(--amber)', border: `1px solid ${m.status === 'confirmed' ? 'rgba(16,185,129,.2)' : 'rgba(245,158,11,.2)'}` }}>
                    {m.status.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="q-btn generate" onClick={() => showToast('📋 Meeting notes loaded', 'primary')}>Prep Notes</button>
                    <button className="q-btn approve" onClick={() => window.open(m.link, '_blank')}>Join</button>
                  </div>
                </div>
              </div>
            ))}
            {activeEvents.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-3)' }}>
                No events found in this category
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
