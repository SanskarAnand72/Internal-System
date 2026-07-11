'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function EmailPreviewModal() {
  const { emailModalData, setEmailModalData, showToast } = useApp();

  if (!emailModalData) return null;

  const handleClose = () => {
    setEmailModalData(null);
  };

  const handleApprove = () => {
    showToast(`✅ Email approved and queued in Brevo for ${emailModalData.company}`, 'success');
    setEmailModalData(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">AI-Generated Recovery Email</div>
            <div className="modal-sub">
              {emailModalData.company} · {emailModalData.to}
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="email-preview">
            <div className="email-field"><span>To:</span> {emailModalData.to}</div>
            <div className="email-field"><span>Subject:</span> {emailModalData.subject}</div>
            <div className="email-divider"></div>
            <div className="email-body-text" style={{ whiteSpace: 'pre-wrap' }}>
              {emailModalData.body}
            </div>
          </div>
          <div className="modal-ai-note">
            <span>✦</span>
            <div>{emailModalData.reason}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => showToast('Draft saved as template', 'success')}>Edit</button>
          <button className="btn-ghost" onClick={() => showToast('AI is regenerating a new variant...', 'primary')}>Regenerate</button>
          <button className="btn-primary" onClick={handleApprove}>Approve &amp; Send via Brevo</button>
        </div>
      </div>
    </div>
  );
}
