'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { data: session, status } = useSession();

  // ── Workspace ────────────────────────────────────────────────────────────
  const [workspace, setWorkspace] = useState(null);   // { id, name, ownerId, spreadsheetId, … }
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient]         = useState('');
  const [openDrawerId, setOpenDrawerId]             = useState(null);
  const [selectedLead, setSelectedLead]             = useState(null);
  const [toast, setToast]                           = useState(null);
  const [emailModalData, setEmailModalData]         = useState(null);
  const [scrollPositions, setScrollPositions]       = useState({});
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [automationStatus, setAutomationStatus]     = useState(true);

  // ── Sync State ───────────────────────────────────────────────────────────
  const [syncing, setSyncing]       = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const [sheetsError, setSheetsError]   = useState('No Data Connected');
  const [gmailError, setGmailError]     = useState(null);
  const [calendarError, setCalendarError] = useState(null);

  // ── Live Data ─────────────────────────────────────────────────────────────
  const [leads, setLeads]       = useState([]);
  const [rowsCount, setRowsCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [revCount, setRevCount] = useState(0);
  const [confAvg, setConfAvg]   = useState(0);
  const [sheetName, setSheetName] = useState('No Sheet Connected');

  const [sheetData, setSheetData] = useState({ headers: [], rows: [] });
  const [overviewMetrics, setOverviewMetrics] = useState({ rows: 0, opp: 0, rev: 0, conf: 0 });
  const [queueData, setQueueData] = useState([]);
  const [recoveryData, setRecoveryData] = useState([]);

  const [gmailData, setGmailData] = useState({
    unreadCount: 0, threads: [],
    categories: { inbox: 0, sent: 0, replies: 0, interested: [], meetingRequested: [], notInterested: [], noResponse: [] },
  });
  const [calendarData, setCalendarData] = useState({ upcoming: [], completed: [] });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── Load Workspace ────────────────────────────────────────────────────────
  const loadWorkspace = useCallback(async () => {
    if (status !== 'authenticated') return;
    setWorkspaceLoading(true);
    try {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data);
        if (data.name) setSelectedClient(data.name);
      }
    } catch { /* silent */ }
    finally { setWorkspaceLoading(false); }
  }, [status, session?.user?.workspaceId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  // ── Spreadsheet ID (from workspace, owner can update) ─────────────────────
  const activeSpreadsheetId = workspace?.spreadsheetId || '';

  const updateSpreadsheetId = async (id) => {
    if (session?.user?.role !== 'Owner') return;
    const res = await fetch('/api/workspace', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ spreadsheetId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      setWorkspace(prev => ({ ...prev, spreadsheetId: data.workspace?.spreadsheetId || id }));
      showToast('📝 Spreadsheet ID saved to workspace', 'success');
    } else {
      showToast('Failed to save spreadsheet ID', 'primary');
    }
  };

  // ── Core Sync ─────────────────────────────────────────────────────────────
  const syncData = useCallback(async (isManual = false) => {
    if (status !== 'authenticated') {
      setSheetsError('No User Authenticated');
      return;
    }

    setSyncing(true);
    if (isManual) showToast('🔄 Syncing Google Workspace Data…', 'primary');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1 · Google Sheets — always ask the server; it reads spreadsheetId from DB, not URL params
    try {
      const res  = await fetch(`/api/google/sheet`);
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setRowsCount(data.rows || 0);
        setOppCount(data.opp  || 0);
        setRevCount(data.rev  || 0);
        setConfAvg(data.conf  || 0);
        setSheetName(data.sheetName || 'Connected Sheet');
        setSheetData(data.sheetData || { headers: [], rows: [] });
        setOverviewMetrics(data.overviewMetrics || { rows: 0, opp: 0, rev: 0, conf: 0 });
        setQueueData(data.queueData || []);
        setRecoveryData(data.recoveryData || []);
        setSheetsError(null);
      } else {
        setLeads([]); setRowsCount(0); setOppCount(0); setRevCount(0); setConfAvg(0);
        setSheetData({ headers: [], rows: [] });
        setOverviewMetrics({ rows: 0, opp: 0, rev: 0, conf: 0 });
        setQueueData([]); setRecoveryData([]);
        setSheetsError(data.message || 'Failed to load sheet data');
      }
    } catch {
      setSheetsError('Network error syncing sheet');
    }

    // 2 · Email Provider (Gmail or Titan)
    try {
      const res  = await fetch('/api/email');
      const data = await res.json();
      if (res.ok) { setGmailData(data); setGmailError(null); }
      else         { setGmailError(data.message || 'Failed to load emails'); }
    } catch { setGmailError('Network error syncing emails'); }

    // 3 · Calendar
    try {
      const res  = await fetch('/api/google/calendar');
      const data = await res.json();
      if (res.ok) { setCalendarData(data); setCalendarError(null); }
      else         { setCalendarError(data.message || 'Failed to load calendar events'); }
    } catch { setCalendarError('Network error syncing Calendar'); }

    setLastSynced(timestamp);
    setSyncing(false);
    if (isManual) showToast('✅ Dashboard synchronized successfully', 'success');
  }, [status, session?.user?.workspaceId]);

  // Sync on workspace load or spreadsheet change
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.workspaceId) syncData();
  }, [workspace?.id, workspace?.spreadsheetId, status, syncData]);

  // 30-second auto-refresh
  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(() => syncData(), 30000);
    return () => clearInterval(interval);
  }, [syncData, status]);

  const clientData = {
    leads, rows: rowsCount, opp: oppCount, rev: revCount, conf: confAvg,
    sheetName, sheetsError, gmailError, calendarError, lastSynced, gmailData, calendarData,
    sheetData, overviewMetrics, queueData, recoveryData
  };

  return (
    <AppContext.Provider value={{
      // workspace
      workspace,
      workspaceLoading,
      loadWorkspace,
      activeSpreadsheetId,
      updateSpreadsheetId,
      // UI
      selectedClient,
      setSelectedClient,
      openDrawerId,
      setOpenDrawerId,
      selectedLead,
      setSelectedLead,
      toast,
      showToast,
      emailModalData,
      setEmailModalData,
      scrollPositions,
      setScrollPositions,
      commandPaletteOpen,
      setCommandPaletteOpen,
      automationStatus,
      setAutomationStatus,
      // sync
      syncing,
      syncData,
      clientData,
      // new exposed integration states
      sheetData,
      overviewMetrics,
      queueData,
      recoveryData,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
