'use client';

import React, { useState, Suspense } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signOut({ redirect: false });
      await signIn('google', { callbackUrl });
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const errorParam = searchParams.get('error');
  let errorMessage = '';
  if (errorParam === 'missing_scopes') {
    errorMessage = '⚠️ Additional Google permissions are required. When signing in, please ensure all boxes (Sheets, Gmail, Calendar) are checked so the AI dashboard functions properly.';
  } else if (errorParam) {
    errorMessage = `⚠️ Authentication error: ${errorParam}`;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--font)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '40px 32px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Logo */}
        <div style={{
          width: '42px',
          height: '42px',
          background: 'rgba(255,255,255,.03)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#loginGlow)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="loginGlow" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8"/>
                <stop offset="1" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Headings */}
        <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-.4px', marginBottom: '8px' }}>
          AI Command Center
        </h1>
        <p style={{ fontSize: '12.5px', color: 'var(--text-2)', marginBottom: '32px', lineHeight: 1.5 }}>
          Authorized operations access only. Authenticate with your corporate Google workspace credentials.
        </p>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px 14px',
            color: '#f87171',
            fontSize: '11.5px',
            textAlign: 'left',
            lineHeight: 1.4,
            marginBottom: '20px',
            width: '100%'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Sign in with Google Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px',
            background: 'var(--text)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--bg)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            opacity: loading ? 0.75 : 1
          }}
        >
          {loading ? (
            <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--bg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        {/* Footer info */}
        <div style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-3)' }}>
          Secured by Auth.js v5 · Internal System Operations
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        Loading authentication page...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
