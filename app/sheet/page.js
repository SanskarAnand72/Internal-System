'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function RecoverySheetPage() {
  const { sheetData, overviewMetrics, clientData, selectedClient, showToast, syncing, syncData, activeSpreadsheetId } = useApp();
  const [checked, setChecked] = useState({});

  const hasError = !!clientData.sheetsError;

  const toggleCheck = (idx) => setChecked(p => ({ ...p, [idx]: !p[idx] }));
  
  const allChecked = sheetData.rows && sheetData.rows.length > 0 && sheetData.rows.every((_, idx) => checked[idx]);
  
  const toggleAll = () => {
    if (allChecked) setChecked({});
    else setChecked(Object.fromEntries(sheetData.rows.map((_, idx) => [idx, true])));
  };

  const selectedCount = Object.values(checked).filter(Boolean).length;

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Recovery Sheet</h1>
        <p className="page-sub">Live Google Sheets synchronization — {selectedClient}</p>
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
          <div style={{ fontSize: '32px' }}>📊</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Data Connected</div>
          <p style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '380px', lineHeight: 1.5, margin: 0 }}>
            {clientData.sheetsError || "Configure a valid Google Sheets Spreadsheet ID in settings to synchronize rows."}
          </p>
          <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </button>
        </div>
      ) : (
        <>
          {/* Top Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="sheet-badge connected"><span className="sheet-badge-dot" />Live Connected</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                Last synced <strong>{clientData.lastSynced || "Never"}</strong>
              </span>
              {selectedCount > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--violet)', fontWeight: 600 }}>{selectedCount} selected</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {selectedCount > 0 && (
                <button className="btn-ghost" onClick={() => showToast(`✅ Queued campaign outreach for ${selectedCount} selected rows`, 'success')}>
                  Queue Selected
                </button>
              )}
              <button className="btn-ghost" onClick={() => syncData(true)} disabled={syncing}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
              <button className="btn-secondary" onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}`, '_blank')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Open Sheet
              </button>
            </div>
          </div>

          {/* Sheet Widget */}
          <div className="sheet-widget">
            <div className="sheet-widget-header">
              <div className="sheet-status-row">
                <div>
                  <div className="sheet-name">{clientData.sheetName}</div>
                  <div className="sheet-meta-row">
                    <span className="sheet-meta-item">Rows: <strong>{overviewMetrics.rows}</strong></span>
                    <span className="sheet-meta-item">Opportunities: <strong>{overviewMetrics.opp}</strong></span>
                  </div>
                </div>
              </div>
              <div className="ai-badge-sm">✦ Google Sheets API Sync</div>
            </div>

            <div className="sheet-table-wrap">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th className="sheet-th-check">
                      <input type="checkbox" className="sheet-checkbox" onChange={toggleAll} checked={allChecked} />
                    </th>
                    <th>#</th>
                    {sheetData.headers && sheetData.headers.map((header, idx) => (
                      <th key={idx}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.rows && sheetData.rows.map((row, rowIdx) => {
                    const rowId = rowIdx + 1;
                    return (
                      <tr key={rowIdx}>
                        <td className="sheet-th-check">
                          <input type="checkbox" className="sheet-checkbox" checked={!!checked[rowIdx]} onChange={() => toggleCheck(rowIdx)} />
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: '10.5px' }}>{rowId}</td>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} style={{ whiteSpace: 'nowrap' }}>{cell !== undefined ? cell : '—'}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="sheet-footer">
              <span className="sheet-footer-text">Showing {sheetData.rows ? sheetData.rows.length : 0} of <strong>{overviewMetrics.rows}</strong> rows</span>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
