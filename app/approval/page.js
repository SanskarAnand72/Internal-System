'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

const PENDING_EMAILS = [
  { id: 1, company: 'Apex Solutions', name: 'Mark Reynolds', subject: 'Quick thought on the project you shelved last quarter', score: 91, value: '$34K', seq: 'Email #1', approved: false },
  { id: 2, company: 'TechBridge Inc', name: 'David Lee', subject: 'The specific reason most projects stall (and how we solve it)', score: 87, value: '$52K', seq: 'Email #1', approved: false },
  { id: 3, company: 'Skyline Group', name: 'James Park', subject: 'Your proposal — 3 things that changed since we last spoke', score: 79, value: '$67K', seq: 'Email #2', approved: false },
  { id: 4, company: 'NovaMed Corp', name: 'Lisa Turner', subject: 'One question about the Novamed project', score: 75, value: '$19K', seq: 'Email #1', approved: true },
  { id: 5, company: 'Delta Systems', name: 'Rachel N.', subject: 'Still worth a 15-minute conversation?', score: 68, value: '$41K', seq: 'Email #3', approved: false },
];

const BODY_TEMPLATE = (name, company) => `Hi ${name},

I wanted to personally follow up on the proposal we sent over for ${company}.

I know timing isn't always right — but our AI flagged your account based on industry trends that directly affect ${company}'s pipeline.

Specifically: companies in your sector that acted on this type of proposal in Q3 saw a 38% faster close rate.

Would a quick 15-minute call make sense this week?

Best,
Sanskar Kulkarni
Internal System`;

export default function ApprovalPage() {
  const { selectedClient, showToast, setEmailModalData } = useApp();
  const [emails, setEmails] = useState(PENDING_EMAILS);
  const [selected, setSelected] = useState(null);

  const selectedEmail = emails.find(e => e.id === selected);
  const pending = emails.filter(e => !e.approved).length;
  const approved = emails.filter(e => e.approved).length;

  const approve = (id) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, approved: true } : e));
    showToast('✅ Email approved — queued for send', 'success');
    setSelected(null);
  };

  const reject = (id) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    showToast('🗑 Email rejected and removed', 'primary');
    setSelected(null);
  };

  const approveAll = () => {
    setEmails(prev => prev.map(e => ({ ...e, approved: true })));
    showToast(`✅ All ${pending} emails approved and queued`, 'success');
    setSelected(null);
  };

  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Message Approval</h1>
        <p className="page-sub">Review and approve AI-generated recovery emails before launch — {selectedClient}</p>
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="approval-tabs">
          {[
            { key: 'pending', label: 'Pending', count: pending, cls: 'amber' },
            { key: 'approved', label: 'Approved', count: approved, cls: 'green' },
          ].map(t => (
            <div key={t.key} className="approval-tab active" style={{ cursor: 'default' }}>
              {t.label}
              <span className={`approval-count ${t.cls}`}>{t.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {pending > 0 && (
            <button className="btn-primary" onClick={approveAll}>Approve All {pending}</button>
          )}
          <button className="btn-ghost" onClick={() => showToast('✦ Regenerating all emails via AI…', 'primary')}>Regenerate</button>
        </div>
      </div>

      {/* Split pane */}
      <div className="approval-layout">
        {/* List */}
        <div className="approval-list">
          {emails.map(e => (
            <div
              key={e.id}
              className={`approval-item ${selected === e.id ? 'selected' : ''}`}
              style={{ borderLeft: `2px solid ${e.approved ? 'var(--green)' : selected === e.id ? 'var(--violet)' : 'transparent'}` }}
              onClick={() => setSelected(e.id)}
            >
              <div className="ai-item-head">
                <span className="ai-item-name">{e.company}</span>
                <span className="ai-item-prob">{e.score}%</span>
              </div>
              <div className="ai-item-subj">{e.subject}</div>
              <div className="ai-item-meta">
                {e.seq} · {e.value}
                {e.approved && <span style={{ color: 'var(--green)', marginLeft: '6px', fontWeight: 700 }}>✓ Approved</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        {selectedEmail ? (
          <div className="preview-panel">
            <div className="preview-hdr">
              <div>
                <div className="preview-company">{selectedEmail.company}</div>
                <div className="preview-meta">{selectedEmail.name} · {selectedEmail.seq} · Recovery Score: {selectedEmail.score}% · Value: {selectedEmail.value}</div>
              </div>
              <div className="preview-actions">
                {!selectedEmail.approved && (
                  <>
                    <button className="preview-btn approve" onClick={() => approve(selectedEmail.id)}>Approve</button>
                    <button className="preview-btn reject" onClick={() => reject(selectedEmail.id)}>Reject</button>
                  </>
                )}
                <button className="preview-btn" onClick={() => {
                  setEmailModalData({
                    to: `${selectedEmail.name} <${selectedEmail.name.split(' ')[0].toLowerCase()}@${selectedEmail.company.toLowerCase().replace(/\s+/g,'')}.com>`,
                    subject: selectedEmail.subject,
                    body: BODY_TEMPLATE(selectedEmail.name.split(' ')[0], selectedEmail.company),
                    company: selectedEmail.company,
                    score: selectedEmail.score,
                    recoveryPotential: selectedEmail.value,
                  });
                }}>Full Preview</button>
              </div>
            </div>
            <div className="preview-email-box" style={{ flex: 1 }}>
              <div className="preview-field"><span>To:</span> {selectedEmail.name} &lt;{selectedEmail.name.split(' ')[0].toLowerCase()}@{selectedEmail.company.toLowerCase().replace(/\s+/g,'')}.com&gt;</div>
              <div className="preview-field"><span>Subject:</span> {selectedEmail.subject}</div>
              <div className="preview-divider" />
              <div className="preview-body-text" style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: '1.7' }}>
                {BODY_TEMPLATE(selectedEmail.name.split(' ')[0], selectedEmail.company)}
              </div>
            </div>
            <div className="modal-ai-note">
              <span>✦</span>
              <span>AI confidence: <strong>{selectedEmail.score}%</strong> — curiosity-first subject line, personalised to {selectedEmail.company}'s industry signals.</span>
            </div>
          </div>
        ) : (
          <div className="preview-placeholder" style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', gap: '8px' }}>
            <div style={{ fontSize: '28px' }}>✉️</div>
            <div style={{ fontWeight: 600 }}>Select an email to preview</div>
            <div style={{ fontSize: '11px' }}>Click any item from the list</div>
          </div>
        )}
      </div>
    </>
  );
}
