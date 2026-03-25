'use client';
import { useEffect, useState } from 'react';

// ✅ パスワードをここで変更してください
const ADMIN_PASSWORD = 'cloudfan2025';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuth,   setIsAuth]   = useState(false);
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') setIsAuth(true);
    setChecking(false);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuth(true);
      setError('');
    } else {
      setError('❌ パスワードが違います');
      setPassword('');
    }
  };

  if (checking) return null;

  if (!isAuth) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2e4a 50%, #1e4d8c 100%)',
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '48px 40px', width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', textAlign: 'center',
      }}>
        {/* ロゴ */}
        <div style={{ marginBottom: 8 }}>
          <img src="/logo.png" alt="CloudFan" style={{ height: 48 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a2e4a', marginBottom: 6 }}>
          CloudFan 管理者
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32 }}>
          🔒 管理者専用エリアです
        </p>

        {/* パスワード入力 */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            placeholder="パスワードを入力"
            style={{
              width: '100%', padding: '14px 18px', border: '2px solid #e2e8f0',
              borderRadius: 10, fontSize: 16, boxSizing: 'border-box',
              outline: 'none', textAlign: 'center', letterSpacing: '0.1em',
            }}
            autoFocus
          />
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: '100%', padding: '14px 0',
            background: 'linear-gradient(135deg, #1a2e4a, #2563eb)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}>
          🔓 ログイン
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: '#cbd5e1' }}>
          ブラウザを閉じると自動ログアウトします
        </p>
      </div>
    </div>
  );

  return <>{children}</>;
}
