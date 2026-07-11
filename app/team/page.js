'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useApp } from '@/context/AppContext';

const ROLE_COLORS = {
  Owner:    { bg: 'rgba(251,191,36,.12)',  color: '#f59e0b',   border: 'rgba(251,191,36,.25)' },
  Operator: { bg: 'rgba(129,140,248,.12)', color: 'var(--violet)', border: 'rgba(129,140,248,.25)' },
  Viewer:   { bg: 'rgba(255,255,255,.06)', color: 'var(--text-2)', border: 'var(--border)' },
};

function RoleBadge({ role }) {
  const style = ROLE_COLORS[role] || ROLE_COLORS.Viewer;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: '20px', fontSize: '10.5px',
      fontWeight: 700, background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    }}>
      {role}
    </span>
  );
}

function timeAgo(iso) {
  if (!iso) return 'Never';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '28px 32px', maxWidth: '380px', width: '100%', boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{title}</div>
        <p style={{ fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '22px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className={danger ? 'btn-ghost' : 'btn-primary'}
            style={danger ? { borderColor: 'rgba(239,68,68,.3)', color: 'var(--red)' } : {}}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ────────────────────────────────────────────────────────────
function InviteModal({ onClose, onCreated }) {
  const [email, setEmail]   = useState('');
  const [role, setRole]     = useState('Operator');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);  // { inviteUrl }
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true); setError('');
    const res  = await fetch('/api/team/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Failed to create invitation.'); return; }
    setResult(data);
    onCreated?.();
  };

  const handleCopy = () => {
    if (!result?.inviteUrl) return;
    navigator.clipboard.writeText(result.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '28px 32px', maxWidth: '420px', width: '100%', boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>Invite Team Member</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>

        {!result ? (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600,
                display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="team@example.com"
                autoFocus
                style={{
                  width: '100%', background: 'var(--bg-card-alt)',
                  border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: '8px', padding: '8px 12px',
                  color: 'var(--text)', fontSize: '12.5px',
                  outline: 'none', fontFamily: 'var(--font)',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600,
                display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-card-alt)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '8px 12px', color: 'var(--text)', fontSize: '12.5px',
                  outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                }}
              >
                <option value="Operator">Operator — Can manage leads, approve emails, update statuses</option>
                <option value="Viewer">Viewer — Read-only access</option>
              </select>
            </div>

            {error && <p style={{ fontSize: '11px', color: 'var(--red)', marginBottom: '12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleInvite} disabled={loading}>
                {loading ? 'Generating…' : 'Generate Invite Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              background: 'rgba(129,140,248,.08)', border: '1px solid rgba(129,140,248,.2)',
              borderRadius: '8px', padding: '14px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 600 }}>
                INVITE LINK GENERATED
              </div>
              <div style={{
                fontSize: '11.5px', color: 'var(--text)', wordBreak: 'break-all', lineHeight: 1.5,
                fontFamily: 'monospace', background: 'var(--bg-card-alt)',
                padding: '8px 10px', borderRadius: '6px',
              }}>
                {result.inviteUrl}
              </div>
            </div>

            <p style={{ fontSize: '11.5px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.6 }}>
              Share this link with <strong style={{ color: 'var(--text)' }}>{result.invitation?.email}</strong>.
              It expires in 7 days. The invited user will sign in with Google to accept — no Google API permissions will be requested from them.
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleCopy}
              >
                {copied ? '✓ Copied!' : '📋 Copy Invite Link'}
              </button>
              <button className="btn-ghost" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TeamPage() {
  const { data: session } = useSession();
  const { showToast }     = useApp();
  const isOwner           = session?.user?.role === 'Owner';

  const [members, setMembers]           = useState([]);
  const [pending, setPending]           = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [confirm, setConfirm]           = useState(null);  // { type, payload, title, message }

  const load = useCallback(async () => {
    setLoadingMembers(true);
    const [mRes, iRes] = await Promise.all([
      fetch('/api/team/members'),
      isOwner ? fetch('/api/team/invitations') : Promise.resolve({ ok: false }),
    ]);
    if (mRes.ok) {
      const d = await mRes.json();
      setMembers(d.members || []);
    }
    if (iRes.ok) {
      const d = await iRes.json();
      setPending(d.invitations || []);
    }
    setLoadingMembers(false);
  }, [isOwner]);

  useEffect(() => { load(); }, [load]);

  // ── Role Change ────────────────────────────────────────────────────────────
  const handleRoleChange = (member, newRole) => {
    setConfirm({
      type: 'role', payload: { userId: member.id, role: newRole, name: member.name },
      title: 'Change Role',
      message: `Change ${member.name}'s role to ${newRole}?`,
    });
  };

  const handleRemove = (member) => {
    setConfirm({
      type: 'remove', payload: { userId: member.id, name: member.name },
      title: 'Remove Member',
      message: `Remove ${member.name} from the workspace? They will lose access immediately.`,
      danger: true,
    });
  };

  const handleRevoke = (inv) => {
    setConfirm({
      type: 'revoke', payload: { token: inv.token, email: inv.email },
      title: 'Revoke Invitation',
      message: `Revoke the invitation for ${inv.email}? The link will stop working immediately.`,
      danger: true,
    });
  };

  const handleConfirm = async () => {
    const { type, payload } = confirm;
    setConfirm(null);

    if (type === 'role') {
      const res = await fetch('/api/team/role', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: payload.userId, role: payload.role }),
      });
      if (res.ok) { showToast(`✅ ${payload.name}'s role updated to ${payload.role}`, 'success'); load(); }
      else        { showToast('Failed to update role', 'primary'); }
    }

    if (type === 'remove') {
      const res = await fetch('/api/team/remove', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: payload.userId }),
      });
      if (res.ok) { showToast(`✅ ${payload.name} removed from workspace`, 'success'); load(); }
      else        { showToast('Failed to remove member', 'primary'); }
    }

    if (type === 'revoke') {
      const res = await fetch('/api/team/revoke', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: payload.token }),
      });
      if (res.ok) { showToast(`✅ Invitation for ${payload.email} revoked`, 'success'); load(); }
      else        { showToast('Failed to revoke invitation', 'primary'); }
    }
  };

  return (
    <>
      {/* Modals */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={() => { load(); }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.type === 'remove' ? 'Remove Member' : confirm.type === 'revoke' ? 'Revoke Invite' : 'Change Role'}
          danger={confirm.danger}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className="page-heading">
        <h1 className="page-title">Team</h1>
        <p className="page-sub">Manage workspace members and invitations</p>
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {members.filter(m => m.status === 'active').map(m => (
            <div key={m.id} style={{
              width: '26px', height: '26px', borderRadius: '8px', overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--violet), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 800, color: '#fff',
            }}>
              {m.image
                ? <img src={m.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (m.name?.[0] || '?')}
            </div>
          ))}
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowInvite(true)}>
            + Invite Member
          </button>
        )}
      </div>

      {/* Members Grid */}
      {loadingMembers ? (
        <div style={{ color: 'var(--text-3)', fontSize: '13px', padding: '20px 0' }}>Loading members…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', marginBottom: '24px' }}>
          {members.map(m => (
            <div key={m.id} className="campaign-card" style={{ padding: '18px' }}>
              {/* Avatar + info */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--grey), var(--text-3))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '15px', color: '#fff',
                }}>
                  {m.image
                    ? <img src={m.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (m.name?.[0] || '?')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.name}
                    {m.id === session?.user?.id && (
                      <span style={{ marginLeft: '5px', fontSize: '10px', color: 'var(--text-3)' }}>(you)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.email}
                  </div>
                </div>
              </div>

              {/* Role + last login */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <RoleBadge role={m.role} />
                <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                  {timeAgo(m.lastLogin)}
                </span>
              </div>

              {/* Actions — Owner only, cannot target themselves or the owner */}
              {isOwner && m.id !== session?.user?.id && m.role !== 'Owner' && (
                <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <select
                    defaultValue={m.role}
                    onChange={e => handleRoleChange(m, e.target.value)}
                    style={{
                      flex: 1, background: 'var(--bg-card-alt)', border: '1px solid var(--border)',
                      borderRadius: '7px', padding: '5px 8px', color: 'var(--text)',
                      fontSize: '11.5px', cursor: 'pointer', fontFamily: 'var(--font)',
                    }}
                  >
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <button
                    className="q-btn skip"
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                    onClick={() => handleRemove(m)}
                    title="Remove member"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending Invitations */}
      {isOwner && pending.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '10px' }}>
            Pending Invitations ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pending.map(inv => (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'rgba(255,255,255,.06)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                }}>✉️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{inv.email}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                    Invited as {inv.role} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <RoleBadge role={inv.role} />
                <button
                  className="q-btn skip"
                  style={{ fontSize: '11px', padding: '4px 10px', flexShrink: 0 }}
                  onClick={() => handleRevoke(inv)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
