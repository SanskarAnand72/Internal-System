'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

function JoinPageContent() {
  const searchParams         = useSearchParams();
  const token                = searchParams.get('token');
  const { data: session, update } = useSession();
  const router               = useRouter();
  const called               = useRef(false);

  const [status, setStatus]  = useState('joining'); // joining | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || !session?.user?.email || called.current) return;
    called.current = true;

    (async () => {
      try {
        const res  = await fetch('/api/team/join', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setMessage(data.error || 'Failed to join workspace.');
          return;
        }

        // Force session refresh so the new workspaceId / role appear in the JWT
        await update();
        setStatus('success');
        setTimeout(() => router.replace('/'), 1200);
      } catch {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    })();
  }, [token, session, update, router]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ textAlign: 'center', padding: '40px' }}>
        {status === 'joining' && (
          <>
            <span style={{
              display: 'inline-block', width: '40px', height: '40px',
              border: '3px solid var(--border)', borderTopColor: 'var(--violet)',
              borderRadius: '50%', animation: 'spin .7s linear infinite',
            }} />
            <p style={{ color: 'var(--text-2)', fontSize: '14px', marginTop: '16px' }}>
              Joining workspace…
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Welcome aboard!</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>Redirecting to your dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Could not join workspace</h2>
            <p style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '20px' }}>{message}</p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '9px 20px', background: 'var(--violet)', border: 'none',
                borderRadius: '8px', color: '#fff', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <span style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--violet)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
