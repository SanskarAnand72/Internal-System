/* ═══════════════════════════════════════════════════
   REVRECOVERY — APP LOGIC
   Handles Client Switcher, Skeletons, Drawers, Sheets table,
   Queue, n8n Workflow status, Brevo approvals, Categorised replies,
   Meetings, Charts, and Command Palette actions.
═══════════════════════════════════════════════════ */

'use strict';

// ─── CLIENT DATABASE MOCK ───
const CLIENTS_DATA = {
  "Mercato Agency": {
    rows: 487, opp: 127, rev: 482000, conf: 91,
    sheetName: "Mercato Agency — Recovery Workspace",
    leads: [
      { name: "James", company: "Acme Corp", val: "$18,000", contact: "41d ago", score: 94, tier: "high", status: "Email ready", action: "Send Recovery Email" },
      { name: "Sarah", company: "TechFlow Ltd", val: "$32,000", contact: "27d ago", score: 88, tier: "high", status: "Awaiting review", action: "Send Intro Email" },
      { name: "John", company: "NovaSys", val: "$54,000", contact: "33d ago", score: 85, tier: "high", status: "Meeting booked", action: "Call + Follow-up" },
      { name: "Elena", company: "DataBridge", val: "$12,500", contact: "52d ago", score: 72, tier: "medium", status: "Email ready", action: "Send Recovery Email" },
      { name: "Marcus", company: "CloudPeak", val: "$9,800", contact: "38d ago", score: 68, tier: "medium", status: "Awaiting review", action: "Send Recovery Email" },
      { name: "Claire", company: "Meridian Health", val: "$76,000", contact: "44d ago", score: 81, tier: "high", status: "Email ready", action: "Send Recovery Email" },
      { name: "David", company: "Apex Solutions", val: "$21,000", contact: "67d ago", score: 61, tier: "medium", status: "Paused", action: "Send Value Email" },
      { name: "Sophie", company: "Strata Digital", val: "$7,400", contact: "89d ago", score: 34, tier: "low", status: "Dead", action: "Send Final Email" }
    ],
    automation: [
      { name: "Google Sheets", icon: "📊", status: "connected" },
      { name: "Brevo", icon: "✉️", status: "connected" },
      { name: "n8n", icon: "🤖", status: "running" },
      { name: "Slack", icon: "💬", status: "connected" },
      { name: "WhatsApp", icon: "📱", status: "connected" }
    ],
    replies: [
      { company: "Acme Corp", cat: "interested", text: "\"Interested — can we discuss this week?\"", time: "2h ago" },
      { company: "TechFlow Ltd", cat: "followup", text: "\"Send me the updated proposal.\"", time: "5h ago" },
      { company: "NovaSys", cat: "meeting", text: "\"Budget approved. Let's move forward.\"", time: "1d ago" },
      { company: "DataBridge", cat: "not-interested", text: "\"No budget until next fiscal year.\"", time: "2d ago" }
    ]
  },
  "Acme Agency": {
    rows: 312, opp: 84, rev: 298000, conf: 87,
    sheetName: "Acme Agency — Master Recovery Data",
    leads: [
      { name: "Bob", company: "Vortex Inc", val: "$22,000", contact: "12d ago", score: 91, tier: "high", status: "Email ready", action: "Send Recovery Email" },
      { name: "Alice", company: "Apex Corp", val: "$15,400", contact: "45d ago", score: 79, tier: "medium", status: "Awaiting review", action: "Send Intro Email" },
      { name: "Tim", company: "Zeta Partners", val: "$43,000", contact: "20d ago", score: 86, tier: "high", status: "Email ready", action: "Call + Follow-up" },
      { name: "Rachel", company: "Inertia Labs", val: "$8,500", contact: "61d ago", score: 58, tier: "medium", status: "Paused", action: "Send Value Email" }
    ],
    automation: [
      { name: "Google Sheets", icon: "📊", status: "connected" },
      { name: "Brevo", icon: "✉️", status: "connected" },
      { name: "n8n", icon: "🤖", status: "running" },
      { name: "Slack", icon: "💬", status: "failed" },
      { name: "WhatsApp", icon: "📱", status: "connected" }
    ],
    replies: [
      { company: "Vortex Inc", cat: "interested", text: "\"Yes, let's connect on Zoom.\"", time: "1h ago" },
      { company: "Apex Corp", cat: "followup", text: "\"Can you lower the price?\"", time: "6h ago" }
    ]
  },
  "TechFlow": {
    rows: 201, opp: 53, rev: 187000, conf: 82,
    sheetName: "TechFlow — Opportunity Tracker",
    leads: [
      { name: "Clara", company: "Synergy Corp", val: "$19,500", contact: "30d ago", score: 89, tier: "high", status: "Email ready", action: "Send Recovery Email" },
      { name: "Frank", company: "Zenith Inc", val: "$31,000", contact: "15d ago", score: 83, tier: "high", status: "Email ready", action: "Send Intro Email" },
      { name: "Gary", company: "Nexus Partners", val: "$11,200", contact: "50d ago", score: 62, tier: "medium", status: "Awaiting review", action: "Send Value Email" }
    ],
    automation: [
      { name: "Google Sheets", icon: "📊", status: "connected" },
      { name: "Brevo", icon: "✉️", status: "failed" },
      { name: "n8n", icon: "🤖", status: "running" },
      { name: "Slack", icon: "💬", status: "connected" },
      { name: "WhatsApp", icon: "📱", status: "connected" }
    ],
    replies: [
      { company: "Synergy Corp", cat: "meeting", text: "\"Please coordinate a call.\"", time: "4h ago" }
    ]
  }
};

let currentClientName = "Mercato Agency";

// Charts Global Storage to prevent overlaps
let trendChartInstance = null;
let funnelChartInstance = null;
let barChartInstance = null;

// ─── ACTIVE EMAILS DATA AWAITING APPROVAL ───
const PENDING_EMAILS = [
  { id: 1, company: "Acme Corp", to: "james@acmecorp.com", subject: "Quick question about the project we discussed", body: "Hi James,\n\nI noticed you reviewed the proposal we sent over — you opened it three times, which tells me there's genuine interest there.\n\nI'd love to understand what's holding things up. Would a 20-minute call this week work?\n\nBest,\nSanskar", reason: "Acme Corp opened proposal 3× with no rejection. Tone: Curiosity-driven." },
  { id: 2, company: "TechFlow Ltd", to: "sarah@techflow.com", subject: "Next steps for proposal", body: "Hi Sarah,\n\nI saw the decision-maker changed. I wanted to send this quick proposal directly so you have it handy.\n\nLet me know if you have time for a brief alignment session.\n\nBest,\nSanskar", reason: "Stakeholder switch identified. Tone: Introductory." },
  { id: 3, company: "DataBridge", to: "elena@databridge.co", subject: "Updating our proposal scope", body: "Hi Elena,\n\nJust wanted to check if Q3 planning is wrapping up. I'm flexible on structure and can adjust scope to fit what makes sense.\n\nLet me know if we should hop on a brief call.\n\nBest,\nSanskar", reason: "Competitor deal fell through. Tone: Collaborative." }
];

/* ─────────────────────────────────────────────────
   CLIENT SWITCHER ENGINE
───────────────────────────────────────────────── */
function initClientSwitcher() {
  const trigger = document.getElementById('client-trigger');
  const dropdown = document.getElementById('client-dropdown');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    dropdown.classList.add('hidden');
  });

  const options = document.querySelectorAll('.client-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      const client = opt.dataset.client;
      switchClient(client);
    });
  });
}

function switchClient(clientName) {
  if (!CLIENTS_DATA[clientName]) return;
  currentClientName = clientName;

  // Update dropdown checked indicators
  document.querySelectorAll('.client-option').forEach(opt => {
    const isMatched = opt.dataset.client === clientName;
    opt.classList.toggle('active', isMatched);
    let check = opt.querySelector('.co-check');
    if (isMatched) {
      if (!check) {
        const c = document.createElement('div');
        c.className = "co-check";
        c.textContent = "✓";
        opt.appendChild(c);
      }
    } else if (check) {
      check.remove();
    }
  });

  // Render Skeleton animation load
  showSkeletonsAndReload();
}

function showSkeletonsAndReload() {
  // Replace dynamic elements with skeletons first
  const sheetTbody = document.getElementById('sheet-tbody');
  const queueGrid = document.getElementById('queue-grid');
  const auditFlow = document.getElementById('audit-flow');
  const campaignsGrid = document.getElementById('campaigns-grid');
  const integrationsGrid = document.getElementById('integrations-grid');
  const repliesGrid = document.getElementById('replies-grid');

  if (sheetTbody) sheetTbody.innerHTML = `<tr><td colspan="9" style="height: 120px;"><div class="skeleton-box" style="height: 100%; width: 100%"></div></td></tr>`;
  if (queueGrid) queueGrid.innerHTML = Array.from({length: 3}).map(() => `<div class="skeleton-box" style="height: 160px; border-radius: 28px;"></div>`).join('');
  if (auditFlow) auditFlow.innerHTML = `<div class="skeleton-box" style="height: 60px; width:100%; border-radius: 28px;"></div>`;
  if (campaignsGrid) campaignsGrid.innerHTML = Array.from({length: 2}).map(() => `<div class="skeleton-box" style="height: 140px; border-radius: 28px;"></div>`).join('');
  if (repliesGrid) repliesGrid.innerHTML = Array.from({length: 3}).map(() => `<div class="skeleton-box" style="height: 100px; border-radius: 14px;"></div>`).join('');

  setTimeout(() => {
    loadClientData();
  }, 400);
}

function loadClientData() {
  const data = CLIENTS_DATA[currentClientName];

  // Update labels
  document.getElementById('client-name-display').textContent = currentClientName;
  document.getElementById('ch-client-sub').textContent = currentClientName;
  document.getElementById('sheet-client-name').textContent = currentClientName;
  document.getElementById('sheet-name-display').textContent = `${currentClientName} — Recovery Workspace`;
  document.getElementById('queue-client-name').textContent = currentClientName;
  document.getElementById('pipeline-client-name').textContent = currentClientName;
  document.getElementById('analytics-client-name').textContent = currentClientName;

  // Counter Targets update
  const rowsEl = document.getElementById('stat-rows');
  const oppEl = document.getElementById('stat-opp');
  const revEl = document.getElementById('stat-rev');
  const confEl = document.getElementById('stat-conf');

  if (rowsEl) { rowsEl.dataset.target = data.rows; rowsEl.textContent = "0"; }
  if (oppEl) { oppEl.dataset.target = data.opp; oppEl.textContent = "0"; }
  if (revEl) { revEl.dataset.target = data.rev; revEl.textContent = "$0"; }
  if (confEl) { confEl.dataset.target = data.conf; confEl.textContent = "0%"; }

  document.getElementById('sheet-rows-display').innerHTML = `<strong>${data.rows}</strong> rows`;
  document.getElementById('sheet-total-rows').textContent = data.rows;
  const insightsRows = document.getElementById('insights-rows');
  if (insightsRows) insightsRows.textContent = data.rows;

  animateCounters();

  // Render components
  renderSheetTable(data.leads);
  renderQueue(data.leads);
  renderAuditFlow(data.opp, data.rows);
  renderCampaigns();
  renderIntegrations(data.automation);
  renderReplies(data.replies);
  renderMeetings();
  renderAIInsights();
  renderApprovalPane();

  // Reload Charts
  initCharts(data.opp, data.rev);
}

/* ─────────────────────────────────────────────────
   RENDER FUNCTIONS
───────────────────────────────────────────────── */
function renderSheetTable(leads) {
  const tbody = document.getElementById('sheet-tbody');
  if (!tbody) return;

  tbody.innerHTML = leads.map(l => `
    <tr>
      <td class="sheet-th-check"><input type="checkbox" class="sheet-checkbox" /></td>
      <td class="sheet-cell-lead">${l.name}</td>
      <td>${l.company}</td>
      <td class="sheet-cell-value">${l.val}</td>
      <td>${l.contact}</td>
      <td><span class="sheet-cell-prob">${l.score}%</span></td>
      <td><span class="sheet-cell-score ${l.tier}">${l.tier.toUpperCase()}</span></td>
      <td><span class="sheet-cell-status">${l.status}</span></td>
      <td><span class="sheet-cell-action">${l.action}</span></td>
    </tr>
  `).join('');
}

function renderQueue(leads, filter = 'all') {
  const grid = document.getElementById('queue-grid');
  if (!grid) return;

  const filtered = filter === 'all' ? leads : leads.filter(l => l.tier === filter);

  grid.innerHTML = filtered.map(l => `
    <div class="q-card ${l.tier}" tabindex="0" role="button">
      <div class="q-card-header">
        <div class="q-company">${l.company}</div>
        <div class="q-tag ${l.tier}">${l.tier.toUpperCase()}</div>
      </div>
      <div class="q-proposal">Proposal Value · <strong>${l.val}</strong></div>
      <div class="q-metrics">
        <div class="q-metric">
          <div class="q-metric-label">Probability</div>
          <div class="q-metric-value green">${l.score}%</div>
        </div>
        <div class="q-metric">
          <div class="q-metric-label">Last Contact</div>
          <div class="q-metric-value amber">${l.contact}</div>
        </div>
      </div>
      <div class="q-reason">
        <div class="q-reason-icon">✦</div>
        <div>Budget cycles align. Proposal opened multiple times.</div>
      </div>
      <div class="q-action-row">
        <div class="q-action-label">→ ${l.action}</div>
        <div class="q-action-btns">
          <button class="q-btn generate" data-company="${l.company}">Generate</button>
          <button class="q-btn approve" onclick="showToast('✅ Approved for launch','success')">Approve</button>
          <button class="q-btn skip">Skip</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.q-btn.generate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEmailModal(btn.dataset.company);
    });
  });
}

function renderAuditFlow(oppCount, totalCount) {
  const flow = document.getElementById('audit-flow');
  if (!flow) return;

  const stages = [
    { label: "Google Sheet", icon: "📊", count: totalCount, status: "done" },
    { label: "AI Audit", icon: "🤖", count: totalCount, status: "done" },
    { label: "High Leads", icon: "🔥", count: Math.round(oppCount * 0.4), status: "active" },
    { label: "Messages", icon: "✉️", count: Math.round(oppCount * 0.7), status: "active" },
    { label: "Brevo Sync", icon: "📡", count: Math.round(oppCount * 0.5), status: "done" },
    { label: "Replies", icon: "💬", count: 18, status: "active" },
    { label: "Meetings", icon: "📅", count: 6, status: "done" },
    { label: "Recovered", icon: "🏆", count: 3, status: "active" }
  ];

  flow.innerHTML = stages.map((s, i) => `
    <div class="af-node ${s.status}">
      <div class="af-icon-circle">${s.icon}</div>
      <div class="af-label">${s.label}</div>
      <div class="af-count">${s.count}</div>
    </div>
    ${i < stages.length - 1 ? `<div class="af-connector ${s.status === 'done' && stages[i+1].status === 'done' ? 'done' : ''}"></div>` : ''}
  `).join('');
}

function renderCampaigns() {
  const grid = document.getElementById('campaigns-grid');
  if (!grid) return;

  const list = [
    { name: "Enterprise Dormant", status: "running", progress: 74, sent: 74, replies: 18, meetings: 6, rev: "$38,000", rate: "24% recovery" },
    { name: "Healthcare Vertical", status: "running", progress: 52, sent: 52, replies: 22, meetings: 8, rev: "$26,000", rate: "31% recovery" },
    { name: "SaaS Cold Outreach", status: "paused", progress: 33, sent: 33, replies: 9, meetings: 3, rev: "$0", rate: "Awaiting sync" }
  ];

  grid.innerHTML = list.map(c => `
    <div class="campaign-card">
      <div class="campaign-header">
        <div class="campaign-name">${c.name}</div>
        <div class="campaign-status ${c.status}">${c.status}</div>
      </div>
      <div class="campaign-progress-wrap">
        <div class="campaign-progress-label"><span>Progress</span><span>${c.progress}%</span></div>
        <div class="campaign-progress-bar"><div class="campaign-progress-fill" style="width:${c.progress}%"></div></div>
      </div>
      <div class="campaign-metrics">
        <div><div class="c-metric-val">${c.sent}</div><div class="c-metric-label">Sent</div></div>
        <div><div class="c-metric-val">${c.replies}</div><div class="c-metric-label">Replies</div></div>
        <div><div class="c-metric-val">${c.meetings}</div><div class="c-metric-label">Meetings</div></div>
      </div>
      <div class="campaign-footer">
        <div class="campaign-revenue">${c.rev}</div>
        <div class="campaign-rate">${c.rate}</div>
      </div>
    </div>
  `).join('');
}

function renderIntegrations(automation) {
  const grid = document.getElementById('integrations-grid');
  if (!grid) return;

  grid.innerHTML = automation.map(a => `
    <div class="int-card">
      <span class="int-icon">${a.icon}</span>
      <div class="int-name">${a.name}</div>
      <span class="int-status ${a.status}">${a.status}</span>
    </div>
  `).join('');
}

function renderReplies(replies) {
  const grid = document.getElementById('replies-grid');
  if (!grid) return;

  grid.innerHTML = replies.map(r => `
    <div class="reply-card">
      <div class="reply-header">
        <div class="reply-company">${r.company}</div>
        <span class="reply-cat-tag ${r.cat}">${r.cat.toUpperCase()}</span>
      </div>
      <div class="reply-snippet">${r.text}</div>
      <div class="reply-meta">
        <span>${r.time}</span>
        <span class="reply-action-link" onclick="showToast('💬 Scheduling follow-up meeting…','primary')">Schedule meeting</span>
      </div>
    </div>
  `).join('');
}

function renderMeetings() {
  const grid = document.getElementById('meetings-grid');
  if (!grid) return;

  const meetings = [
    { day: "9", mon: "Jul", company: "Acme Corp", type: "Discovery Call", time: "10:00 AM", platform: "Zoom", val: "$18K" },
    { day: "11", mon: "Jul", company: "NovaSys", type: "Proposal Review", time: "2:00 PM", platform: "Google Meet", val: "$54K" },
    { day: "14", mon: "Jul", company: "Meridian Health", type: "Contract Details", time: "11:00 AM", platform: "Zoom", val: "$76K" }
  ];

  grid.innerHTML = meetings.map(m => `
    <div class="meet-card">
      <div class="meet-date-box">
        <div class="meet-day">${m.day}</div>
        <div class="meet-month">${m.mon}</div>
      </div>
      <div class="meet-body">
        <div class="meet-title">${m.company} · ${m.type}</div>
        <div class="meet-time">${m.time} · ${m.platform}</div>
      </div>
      <div class="meet-val-badge">${m.val}</div>
    </div>
  `).join('');
}

function renderAIInsights() {
  const grid = document.getElementById('insights-grid');
  if (!grid) return;

  const list = [
    { icon: "🏥", title: "Healthcare proposals recover 38% better", desc: "Decision velocity in healthcare is optimal during early Tuesdays.", confidence: 91 },
    { icon: "⚠️", title: "$84,000 is at risk of going cold", desc: "9 leads have had no touchpoint in 60+ days.", confidence: 88 },
    { icon: "✉️", title: "Curiosity subject lines boost reply by 24%", desc: "Updated 12 pending emails to curiosity-first tone.", confidence: 95 }
  ];

  grid.innerHTML = list.map(ins => `
    <div class="insight-card">
      <div class="insight-header">
        <span class="insight-icon">${ins.icon}</span>
        <div class="insight-title">${ins.title}</div>
      </div>
      <div class="insight-reason">${ins.desc}</div>
      <div class="insight-footer">
        <div class="insight-conf">
          <div class="insight-conf-bar"><div class="insight-conf-fill" style="width:${ins.confidence}%"></div></div>
          ${ins.confidence}% conf
        </div>
        <button class="insight-btn" onclick="showToast('✦ Applying suggestion to all templates','success')">Apply Action</button>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────────
   MESSAGE APPROVAL PANE
───────────────────────────────────────────────── */
function renderApprovalPane() {
  const list = document.getElementById('approval-list');
  const preview = document.getElementById('approval-preview');
  if (!list || !preview) return;

  list.innerHTML = PENDING_EMAILS.map((email, idx) => `
    <div class="approval-item ${idx === 0 ? 'selected' : ''}" data-id="${email.id}">
      <div class="ai-item-head">
        <div class="ai-item-name">${email.company}</div>
        <div class="ai-item-prob">94%</div>
      </div>
      <div class="ai-item-subj">${email.subject}</div>
      <div class="ai-item-meta">
        <span>To: ${email.to}</span>
      </div>
    </div>
  `).join('');

  // Set initial selected item preview
  selectEmailPreview(PENDING_EMAILS[0]);

  // Click handler
  list.querySelectorAll('.approval-item').forEach(item => {
    item.addEventListener('click', () => {
      list.querySelectorAll('.approval-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      const email = PENDING_EMAILS.find(e => e.id == item.dataset.id);
      selectEmailPreview(email);
    });
  });
}

function selectEmailPreview(email) {
  const preview = document.getElementById('approval-preview');
  if (!preview || !email) return;

  preview.innerHTML = `
    <div class="preview-panel">
      <div class="preview-hdr">
        <div>
          <div class="preview-company">${email.company}</div>
          <div class="preview-meta">To: ${email.to} · Subject: ${email.subject}</div>
        </div>
        <div class="preview-actions">
          <button class="preview-btn approve" data-id="${email.id}">Approve</button>
          <button class="preview-btn reject">Reject</button>
        </div>
      </div>
      <div class="preview-email-box">
        <div class="preview-field"><span>To:</span> ${email.to}</div>
        <div class="preview-field"><span>Subject:</span> ${email.subject}</div>
        <div class="preview-divider"></div>
        <div class="preview-body-text">${email.body.replace(/\n/g, '<br>')}</div>
      </div>
      <div class="modal-ai-note" style="margin-top:10px">
        <span>✦</span>
        <div style="font-size:11px">${email.reason}</div>
      </div>
    </div>
  `;

  preview.querySelector('.preview-btn.approve')?.addEventListener('click', () => {
    showToast(`✅ Approved & Sent to ${email.to} via Brevo!`, 'success');
  });
}

/* ─────────────────────────────────────────────────
   DRAWERS (Slide-Over Controllers)
───────────────────────────────────────────────── */
function initDrawers() {
  document.querySelectorAll('[data-drawer]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const id = trigger.getAttribute('data-drawer');
      openDrawer(id);
    });
  });

  document.querySelectorAll('.drawer-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const id = closeBtn.getAttribute('data-drawer');
      closeDrawer(id);
    });
  });

  document.querySelectorAll('.drawer-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
      }
    });
  });
}

function openDrawer(id) {
  const drawer = document.getElementById(id);
  if (!drawer) return;
  drawer.classList.remove('hidden');

  // Load specific Drawer Content
  if (id === 'drawer-high-leads') {
    loadHighLeadsDrawer();
  } else if (id === 'drawer-approve-emails') {
    loadApproveEmailsDrawer();
  } else if (id === 'drawer-cold-leads') {
    loadColdLeadsDrawer();
  }
}

function closeDrawer(id) {
  const drawer = document.getElementById(id);
  if (drawer) drawer.classList.add('hidden');
}

function loadHighLeadsDrawer() {
  const body = document.getElementById('drawer-lead-list');
  if (!body) return;

  const data = CLIENTS_DATA[currentClientName].leads.filter(l => l.tier === 'high');

  body.innerHTML = data.map(l => `
    <div class="drawer-lead-item">
      <div class="dl-head">
        <div class="dl-company">${l.company}</div>
        <div class="dl-val">${l.val}</div>
      </div>
      <div class="dl-meta">Opportunity probability: <strong>${l.score}%</strong> · Contact: ${l.contact}</div>
      <div class="dl-reason">${l.action} sequence is ready. AI confirmed budget window.</div>
      <div class="dl-actions">
        <button class="q-btn generate" onclick="openEmailModal('${l.company}'); closeDrawer('drawer-high-leads')">Generate Email</button>
        <button class="q-btn approve" onclick="showToast('✅ Staged sequence launched','success')">Approve Now</button>
      </div>
    </div>
  `).join('');
}

function loadApproveEmailsDrawer() {
  const body = document.getElementById('approve-email-list');
  if (!body) return;

  body.innerHTML = PENDING_EMAILS.map(e => `
    <div class="drawer-lead-item">
      <div class="dl-head">
        <div class="dl-company">${e.company}</div>
        <div class="dl-val">94%</div>
      </div>
      <div class="dl-meta">To: ${e.to} · Subject: ${e.subject}</div>
      <div class="dl-reason" style="font-family:monospace;white-space:pre-wrap;font-size:11px;background:#09090b">${e.body}</div>
      <div class="dl-actions">
        <button class="q-btn generate">Edit</button>
        <button class="q-btn approve" onclick="showToast('✅ Message sent via Brevo','success')">Approve & Send</button>
      </div>
    </div>
  `).join('');
}

function loadColdLeadsDrawer() {
  const body = document.getElementById('cold-leads-list');
  if (!body) return;

  const data = [
    { company: "Strata Digital", contact: "89 days ago", val: "$7,400", score: "34%" },
    { company: "Vortex Inc", contact: "61 days ago", val: "$22,000", score: "91%" },
    { company: "DataBridge", contact: "52 days ago", val: "$12,500", score: "72%" }
  ];

  body.innerHTML = data.map(l => `
    <div class="drawer-lead-item">
      <div class="dl-head">
        <div class="dl-company">${l.company}</div>
        <div class="dl-val">${l.val}</div>
      </div>
      <div class="dl-meta">No contact for ${l.contact} · AI Score: ${l.score}</div>
      <div class="dl-reason" style="border-color:var(--amber)">Danger zone. Probability decreases by 70% if dormant past 90 days.</div>
      <div class="dl-actions">
        <button class="q-btn approve" onclick="showToast('⚡ Recovery email queued','success')">Trigger sequence</button>
      </div>
    </div>
  `).join('');
}

/* ─────────────────────────────────────────────────
   TOAST NOTIFICATION ENGINE
───────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:99999;
    background:${type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'};
    border:1px solid ${type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'};
    color:${type === 'success' ? '#10b981' : '#818cf8'};
    backdrop-filter:blur(12px);
    padding:10px 16px; border-radius:8px;
    font-size:12px; font-weight:600;
    box-shadow:var(--shadow-lg);
    transform:translateY(15px); opacity:0;
    transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    font-family:var(--font);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  });
  setTimeout(() => {
    el.style.transform = 'translateY(15px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}

/* ─────────────────────────────────────────────────
   CHARTS (Chart.js styling)
───────────────────────────────────────────────── */
function initCharts(opp = 127, rev = 482000) {
  Chart.defaults.color = '#71717a';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  const gridColor = 'rgba(255,255,255,0.03)';
  const tickColor = '#52525b';

  // Destroy previous instances to allow smooth switcher redraws
  if (trendChartInstance) trendChartInstance.destroy();
  if (funnelChartInstance) funnelChartInstance.destroy();
  if (barChartInstance) barChartInstance.destroy();

  // ── Trend Line Chart ──
  const trendCtx = document.getElementById('chart-trend');
  if (trendCtx) {
    trendChartInstance = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
          {
            label: 'Recoverable',
            data: [rev * 0.6, rev * 0.75, rev * 0.6, rev * 0.85, rev * 0.8, rev * 0.9, rev],
            borderColor: '#818cf8',
            backgroundColor: 'rgba(129, 140, 248, 0.03)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
          {
            label: 'Won',
            data: [15000, 22000, 19000, 35000, 42000, 51000, 64000],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.02)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor } },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              callback: v => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'K' : v)
            }
          }
        }
      }
    });
  }

  // ── Funnel Doughnut ──
  const funnelCtx = document.getElementById('chart-funnel');
  if (funnelCtx) {
    funnelChartInstance = new Chart(funnelCtx, {
      type: 'doughnut',
      data: {
        labels: ['Audit', 'Emailed', 'Replied', 'Meeting', 'Won'],
        datasets: [{
          data: [opp, Math.round(opp * 0.77), Math.round(opp * 0.24), Math.round(opp * 0.11), 8],
          backgroundColor: [
            'rgba(129, 140, 248, 0.6)',
            'rgba(167, 139, 250, 0.5)',
            'rgba(16, 185, 129, 0.5)',
            'rgba(6, 182, 212, 0.5)',
            'rgba(245, 158, 11, 0.6)',
          ],
          borderColor: '#121214',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 8, color: '#a1a1aa', padding: 8 }
          }
        }
      }
    });
  }

  // ── Bar Chart ──
  const barCtx = document.getElementById('chart-bar');
  if (barCtx) {
    barChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['SaaS', 'Healthcare', 'Enterprise', 'Growth'],
        datasets: [
          {
            label: 'Sent',
            data: [74, 52, 33, 28],
            backgroundColor: 'rgba(129, 140, 248, 0.5)',
            borderRadius: 4,
          },
          {
            label: 'Replied',
            data: [18, 22, 9, 7],
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#a1a1aa', boxWidth: 8 } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } }
        }
      }
    });
  }
}

/* ─────────────────────────────────────────────────
   COUNTER ANIMATION ENGINE
───────────────────────────────────────────────── */
function animateCounters() {
  const els = document.querySelectorAll('[data-target]');
  const ease = (t) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;

  els.forEach(el => {
    const target = parseFloat(el.dataset.target);
    const prefix = el.dataset.prefix || '';
    const fmt = el.dataset.format;
    const suffix = el.dataset.suffix || '';
    const dur = 1000;
    let start = null;

    function step(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const prog = Math.min(elapsed / dur, 1);
      const val = Math.round(ease(prog) * target);

      if (fmt === 'currency') {
        el.textContent = '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val.toLocaleString());
      } else {
        el.textContent = val.toLocaleString() + suffix;
      }

      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ─────────────────────────────────────────────────
   COMMAND PALETTE
───────────────────────────────────────────────── */
function initCommandPalette() {
  const overlay = document.getElementById('cmd-overlay');
  const input = document.getElementById('cmd-input');
  const items = overlay?.querySelectorAll('.cmd-item');

  function open() {
    overlay.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);
  }

  function close() {
    overlay.classList.add('hidden');
    if (input) input.value = '';
  }

  document.getElementById('open-cmd')?.addEventListener('click', open);
  document.getElementById('topbar-cmd')?.addEventListener('click', open);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      overlay.classList.contains('hidden') ? open() : close();
    }
    if (e.key === 'Escape') close();
  });

  overlay?.addEventListener('click', e => {
    if (e.target === overlay) close();
  });

  items?.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      close();

      if (action.startsWith('client-')) {
        const clientKey = action.replace('client-', '');
        if (clientKey === 'mercato') switchClient('Mercato Agency');
        else if (clientKey === 'acme') switchClient('Acme Agency');
        else if (clientKey === 'techflow') switchClient('TechFlow');
      } else {
        if (action === 'launch') showToast('🚀 Recovery campaign triggered in n8n','primary');
        if (action === 'sync') showToast('🔄 Connected Google Sheet refreshed','success');
        if (action === 'generate') openEmailModal('Selected Opportunities');
        if (action === 'queue') document.querySelector('#queue').scrollIntoView({behavior:'smooth'});
        if (action === 'inbox') document.querySelector('#replies').scrollIntoView({behavior:'smooth'});
      }
    });
  });
}

/* ─────────────────────────────────────────────────
   EMAIL PREVIEW MODAL
───────────────────────────────────────────────── */
function openEmailModal(company) {
  const modal = document.getElementById('email-modal');
  if (!modal) return;
  const sub = document.getElementById('modal-sub-text');
  if (sub) sub.textContent = `${company} · Personalized Recovery Email`;
  modal.classList.remove('hidden');
}

document.getElementById('modal-close')?.addEventListener('click', () => {
  document.getElementById('email-modal')?.classList.add('hidden');
});

/* ─────────────────────────────────────────────────
   QUEUE FILTERS
───────────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const leads = CLIENTS_DATA[currentClientName].leads;
      renderQueue(leads, btn.dataset.filter);
    });
  });
}

/* ─────────────────────────────────────────────────
   AI COPILOT DO BUTTONS
───────────────────────────────────────────────── */
function initCopilotActions() {
  document.querySelectorAll('.ai-do-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.ai-action-item');
      const text = parent?.querySelector('.ai-action-title')?.textContent || '';
      if (text.includes('email') || text.includes('Approve')) {
        openDrawer('drawer-approve-emails');
      } else if (text.includes('Schedule') || text.includes('Book')) {
        showToast('📅 Availability calendar synced with client','primary');
      } else if (text.includes('leads')) {
        openDrawer('drawer-cold-leads');
      }
    });
  });
}

/* ─────────────────────────────────────────────────
   AI PANEL COLLAPSER
───────────────────────────────────────────────── */
function initAIPanelCollapse() {
  const panel = document.getElementById('ai-panel');
  const toggle = document.getElementById('ai-panel-toggle');
  let collapsed = false;

  toggle?.addEventListener('click', () => {
    collapsed = !collapsed;
    if (collapsed) {
      panel.style.width = '0';
      panel.style.overflow = 'hidden';
      panel.style.padding = '0';
      toggle.textContent = '⟨';
    } else {
      panel.style.width = '';
      panel.style.overflow = '';
      toggle.textContent = '⟩';
    }
  });
}

/* ─────────────────────────────────────────────────
   BOOTSTRAP
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initClientSwitcher();
  initDrawers();
  initCommandPalette();
  initFilters();
  initCopilotActions();
  initAIPanelCollapse();

  // Load Initial Client Data (Mercato Agency)
  loadClientData();

  // Primary Action Center buttons
  document.getElementById('btn-launch-hero')?.addEventListener('click', () => {
    showToast('🚀 Recovery Campaign launched via n8n automation!','primary');
  });

  document.getElementById('launch-card')?.addEventListener('click', () => {
    showToast('🚀 Launch sequence completed. n8n running.','primary');
  });
});
