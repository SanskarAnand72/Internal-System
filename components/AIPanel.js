'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function AIPanel() {
  const {
    clientData,
    showToast,
    setEmailModalData,
    setOpenDrawerId,
    setSelectedLead
  } = useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCollapse = () => {
    setCollapsed(prev => !prev);
  };

  const handleDoAction = (action) => {
    if (action.type === 'email' || action.title.toLowerCase().includes('email')) {
      setEmailModalData({
        company: action.company || "Acme Corp",
        to: "james@acmecorp.com",
        subject: "Quick question about the project we discussed",
        body: "Hi James,\n\nI noticed you reviewed the proposal we sent over — you opened it three times, which tells me there's genuine interest there.\n\nI'd love to understand what's holding things up. Would a 20-minute call this week work?\n\nBest,\nSanskar",
        reason: "Acme Corp opened proposal 3× with no rejection. Tone: Curiosity-driven."
      });
    } else if (action.title.toLowerCase().includes('call') || action.title.toLowerCase().includes('book')) {
      showToast('📅 Calendar coordinator link opened', 'primary');
    } else if (action.title.toLowerCase().includes('leads') || action.title.toLowerCase().includes('cold')) {
      setOpenDrawerId('drawer-cold-leads');
    } else {
      showToast('⚡ AI action staged for execution', 'primary');
    }
  };

  // Mock static actions/decisions
  const staticActions = [
    { title: "Send Acme Corp recovery email", company: "Acme Corp", meta: "94% probability · $18K · Mercato", type: "email" },
    { title: "Book call with TechFlow Ltd", company: "TechFlow Ltd", meta: "Replied 2h ago · positive signal", type: "call" },
    { title: "Approve 12 emails before 5 PM", company: "Batch Mode", meta: "Optimal send window closing", type: "batch" },
    { title: "9 leads at 60-day mark", company: "Batch Mode", meta: "$84K at risk — act now", type: "leads" }
  ];

  const staticDecisions = [
    { icon: "✓", text: "Scored NovaSys as HIGH · $54K", reason: "Q3 budget signal + 3× open", time: "3 hours ago", colorClass: "green" },
    { icon: "⏸", text: "Paused Strata Digital sequence", reason: "Hard rejection signal detected", time: "5 hours ago", colorClass: "amber" },
    { icon: "✦", text: "Regenerated DataBridge email", reason: "Switched to curiosity tone (+31%)", time: "6 hours ago", colorClass: "blue" },
    { icon: "✕", text: "Archived 18 DEAD leads", reason: "90+ days · no engagement signal", time: "2:47 AM today", colorClass: "red" }
  ];

  const meetings = [
    { day: "9", mon: "Jul", title: "Acme Corp · Discovery Call", time: "10:00 AM · 45 min · Zoom", val: "$18K" },
    { day: "11", mon: "Jul", title: "NovaSys · Proposal Review", time: "2:00 PM · 30 min · Meet", val: "$54K" },
    { day: "14", mon: "Jul", title: "Meridian Health · Contract", time: "11:00 AM · 60 min · Zoom", val: "$76K" }
  ];

  const styles = collapsed ? {
    width: '0',
    overflow: 'hidden',
    padding: '0',
    borderLeft: 'none'
  } : {};

  return (
    <aside className="ai-panel" id="ai-panel" style={styles}>
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          {!collapsed && <div className="ai-glow-dot"></div>}
          {!collapsed && "AI Copilot"}
        </div>
        <button className="ai-panel-toggle" id="ai-panel-toggle" onClick={toggleCollapse} title={collapsed ? "Expand panel" : "Collapse panel"}>
          {collapsed ? "⟨" : "⟩"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Quick Search */}
          <div className="ai-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-3)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search leads, emails, meetings…"
              className="ai-search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Today's Recommendations */}
          <div className="ai-section">
            <div className="ai-section-label">Today's Recommendations</div>
            <div className="ai-actions-list">
              {staticActions.filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase())).map(action => (
                <div key={action.title} className="ai-action-item" tabIndex={0}>
                  <div className={`ai-action-icon ${action.type === 'email' ? 'urgent' : action.type === 'leads' ? 'warn' : ''}`}>
                    {action.type === 'email' ? '🔥' : action.type === 'call' ? '📞' : action.type === 'batch' ? '⚡' : '⚠️'}
                  </div>
                  <div className="ai-action-body">
                    <div className="ai-action-title">{action.title}</div>
                    <div className="ai-action-meta">{action.meta}</div>
                  </div>
                  <button className="ai-do-btn" onClick={() => handleDoAction(action)}>Do it</button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent AI Decisions */}
          <div className="ai-section">
            <div className="ai-section-label">Recent AI Decisions</div>
            <div className="ai-decisions-list">
              {staticDecisions.map(dec => (
                <div key={dec.text} className="ai-decision-item">
                  <div className={`ai-decision-icon ${dec.colorClass}`}>{dec.icon}</div>
                  <div className="ai-decision-body">
                    <div className="ai-decision-text">{dec.text}</div>
                    <div className="ai-decision-reason">{dec.reason}</div>
                    <div className="ai-decision-time">{dec.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="ai-section">
            <div className="ai-section-label">AI Insights</div>
            <div className="ai-insights-list">
              <div className="ai-insight-item">
                <div className="ai-insight-glow"></div>
                <div className="ai-insight-text">Healthcare proposals recover <strong>38% better</strong> on Tuesdays.</div>
                <div className="ai-insight-conf">Confidence 91%</div>
              </div>
              <div className="ai-insight-item">
                <div className="ai-insight-glow amber"></div>
                <div className="ai-insight-text"><strong>$84K</strong> is at risk of going cold this week.</div>
                <div className="ai-insight-conf">Confidence 88%</div>
              </div>
              <div className="ai-insight-item">
                <div className="ai-insight-glow green"></div>
                <div className="ai-insight-text">Last campaign boosted reply rate by <strong>24%</strong>.</div>
                <div className="ai-insight-conf">Confidence 95%</div>
              </div>
            </div>
          </div>

          {/* Recent Warm Replies */}
          <div className="ai-section">
            <div className="ai-section-label">Recent Warm Replies</div>
            <div className="ai-replies-list">
              {clientData.replies && clientData.replies.slice(0, 3).map(reply => (
                <div key={reply.company} className="ai-reply-item">
                  <div className="ai-reply-avatar" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {reply.company.charAt(0)}
                  </div>
                  <div className="ai-reply-body">
                    <div className="ai-reply-name">{reply.company}</div>
                    <div className="ai-reply-text">{reply.text}</div>
                    <div className="ai-reply-time">{reply.time} · <span className="positive">{reply.cat === 'meeting' ? 'Meeting Req.' : 'Warm'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Meetings */}
          <div className="ai-section">
            <div className="ai-section-label">Upcoming Meetings</div>
            <div className="ai-meetings-list">
              {meetings.map(m => (
                <div key={m.title} className="ai-meeting-item">
                  <div className="ai-meeting-day">
                    <div className="meeting-day-num">{m.day}</div>
                    <div className="meeting-day-name">{m.mon}</div>
                  </div>
                  <div className="ai-meeting-body">
                    <div className="ai-meeting-title">{m.title}</div>
                    <div className="ai-meeting-time">{m.time}</div>
                  </div>
                  <div className="ai-meeting-badge">{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
