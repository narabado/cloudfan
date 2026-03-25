'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_PASSWORD = 'NBD3890';
const SESSION_KEY = 'admin_authenticated';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem(SESSION_KEY) === 'true';
    setAuthenticated(isAuth);
    setLoading(false);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthenticated(true);
      setError('');
    } else {
      setError('❌ パスワードが違います');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
    router.push('/');
  };

  if (loading) return null;

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px 40px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
            管理者ログイン
          </h1>
          <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '14px' }}>
            このページは管理者専用です
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="パスワードを入力"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '16px',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: '#0f172a',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
      }}>
        <span style={{ fontWeight: 'bold' }}>🛡️ 管理者モード</span>
        <button
          onClick={handleLogout}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ログアウト
        </button>
      </div>
      {children}
    </div>
  );
}
