'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function InvitePageContent() {
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');
  const { data: session } = useSession();

  const [info, setInfo]     = useState(null);  // { workspaceName, invitedByName, role, email, expiresAt }
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invitation link.'); setLoading(false); return; }

    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else            { setInfo(data); }
      })
      .catch(() => setError('Unable to validate invitation. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    // Sign in with Google using IDENTITY-ONLY scopes.
    // Gmail, Sheets, Calendar scopes are NOT requested for invited members.
    await signIn('google', {
      callbackUrl: `/join?token=${encodeURIComponent(token)}`,
    }, {
      scope: 'openid email profile',
      prompt: 'select_account',
    });
  };

  if (loading) {
    return (
      <CenteredCard>
        <Spinner />
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '12px' }}>Validating invitation…</p>
      </CenteredCard>
    );
  }

  if (error) {
    return (
      <CenteredCard>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Invitation Invalid</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>{error}</p>
      </CenteredCard>
    );
  }

  if (session?.user?.workspaceId) {
    return (
      <CenteredCard>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Already in a Workspace</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
          You are already a member of a workspace. Each user can only belong to one workspace.
        </p>
      </CenteredCard>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font)', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '44px 36px',
        boxShadow: 'var(--shadow-lg)', textAlign: 'center',
      }}>
        {/* Logo mark */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--violet), #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--violet)', fontWeight: 700,
          letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
          You've been invited
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-.4px', marginBottom: '6px' }}>
          Join {info.workspaceName}
        </h1>

        <p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>{info.invitedByName}</strong> has invited you
          to join as <strong style={{ color: 'var(--text)' }}>{info.role}</strong>.
          <br />Sign in with your Google account to accept.
        </p>

        {/* Role badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px', borderRadius: '20px',
          background: 'rgba(129,140,248,.12)', border: '1px solid rgba(129,140,248,.25)',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Your role:</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--violet)' }}>{info.role}</span>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px', padding: '12px',
            background: 'var(--text)', border: 'none', borderRadius: 'var(--radius-sm)',
            color: 'var(--bg)', fontSize: '13px', fontWeight: 600,
            cursor: joining ? 'wait' : 'pointer', opacity: joining ? 0.75 : 1,
            transition: 'opacity .15s',
          }}
        >
          {joining ? (
            <Spinner dark />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          )}
          {joining ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        <p style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '20px', lineHeight: 1.6 }}>
          Expires {new Date(info.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          Only your identity (name, email, photo) will be shared — no Google API access requested.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CenteredCard({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font)', padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '44px 36px',
        boxShadow: 'var(--shadow-lg)', textAlign: 'center',
      }}>
        {children}
      </div>
    </div>
  );
}

function Spinner({ dark }) {
  return (
    <span style={{
      display: 'inline-block', width: '16px', height: '16px',
      border: `2px solid ${dark ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.2)'}`,
      borderTopColor: dark ? '#111' : '#fff',
      borderRadius: '50%', animation: 'spin .7s linear infinite',
    }} />
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <span style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
