'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = 'NBD3890';
const SESSION_KEY = 'admin_auth';

interface Supporter {
  id: number;
  project_id: number;
  name: string;
  email: string;
  total_amount: number | null;
  tier: string | null;
  status: string;
  message: string | null;
  transfer_code: string | null;
  created_at: string;
}

interface Tier {
  id: number;
  name: string;
  amount: number;
}

interface Project {
  id: number;
  title: string;
  status: string;
  goal_amount: number;
  created_at: string;
  tiers?: Tier[];
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'supporters' | 'projects'>('supporters');
  const [filterPrj, setFilterPrj] = useState('');
  const [filterSts, setFilterSts] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 認証チェック
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = sessionStorage.getItem(SESSION_KEY);
      if (v === 'true') setAuthed(true);
    }
  }, []);

  // データ取得
  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: sup }, { data: prj }] = await Promise.all([
      supabase.from('supporters').select('*').order('created_at', { ascending: false }),
      supabase.from('crowdfunding_projects').select('*').order('created_at', { ascending: false }),
    ]);
    setSupporters(sup || []);
    setProjects(prj || []);
    setLoading(false);
  }

  function resolveAmount(s: Supporter): number {
    if (s.total_amount != null) return s.total_amount;
    const proj = projects.find(p => p.id === s.project_id);
    if (proj?.tiers) {
      const tier = proj.tiers.find(t => t.name === s.tier);
      if (tier) return tier.amount;
    }
    return 0;
  }

  function handleLogin() {
    if (passwordInput === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setAuthed(true);
      setLoginError('');
    } else {
      setLoginError('パスワードが違います');
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    router.push('/');
  }

  async function updateStatus(id: number, status: string) {
    await supabase.from('supporters').update({ status }).eq('id', id);
    setSupporters(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  async function deleteSupporter(id: number) {
    if (!confirm('この支援者を完全に削除しますか？この操作は取り消せません。')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/delete-supporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert('削除に失敗しました: ' + (json.error || '不明なエラー'));
        return;
      }
      setSupporters(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert('削除中にエラーが発生しました');
    } finally {
      setDeletingId(null);
    }
  }

  const isApproved = (s: string) => s === 'approved';
  const isPending = (s: string) => s === 'pending';
  const isRejected = (s: string) => s === 'rejected';
  const isCancelled = (s: string) => s === 'cancelled';

  function statusLabel(s: string) {
    if (isApproved(s)) return '承認済';
    if (isPending(s)) return '保留中';
    if (isRejected(s)) return '却下';
    if (isCancelled(s)) return '取消';
    return s;
  }

  function statusColor(s: string) {
    if (isApproved(s)) return '#16a34a';
    if (isPending(s)) return '#d97706';
    if (isRejected(s)) return '#dc2626';
    if (isCancelled(s)) return '#6b7280';
    return '#374151';
  }

  // ログイン画面
  if (!authed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2540 100%)',
      }}>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '48px 40px',
          width: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h1 style={{ textAlign: 'center', color: '#1a3a5c', marginBottom: '8px', fontSize: '1.5rem', fontWeight: 700 }}>
            管理者ログイン
          </h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '28px', fontSize: '0.9rem' }}>
            Sports Support Hokkaido
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="パスワードを入力"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '8px',
              border: '2px solid #e5e7eb', fontSize: '1rem', marginBottom: '12px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {loginError && (
            <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '8px' }}>{loginError}</p>
          )}
          <button
            onClick={handleLogin}
            style={{
              width: '100%', padding: '12px', background: '#1a3a5c', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // フィルター済みリスト
  const filtered = supporters.filter(s => {
    const prjName = projects.find(p => p.id === s.project_id)?.title || '';
    const matchPrj = filterPrj ? prjName.includes(filterPrj) : true;
    const matchSts = filterSts ? s.status === filterSts : true;
    return matchPrj && matchSts;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ヘッダー */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2540 100%)',
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
          🏒 管理ダッシュボード
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          ログアウト
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {/* タブ */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['supporters', 'projects'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.95rem',
                background: tab === t ? '#1a3a5c' : 'white',
                color: tab === t ? 'white' : '#374151',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              {t === 'supporters' ? '👥 支援者一覧' : '📁 プロジェクト一覧'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>読み込み中...</div>
        )}

        {/* 支援者タブ */}
        {!loading && tab === 'supporters' && (
          <div>
            {/* フィルター */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                placeholder="プロジェクト名で絞り込み"
                value={filterPrj}
                onChange={e => setFilterPrj(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                  fontSize: '0.9rem', minWidth: '200px',
                }}
              />
              <select
                value={filterSts}
                onChange={e => setFilterSts(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                  fontSize: '0.9rem', background: 'white',
                }}
              >
                <option value="">全ステータス</option>
                <option value="pending">保留中</option>
                <option value="approved">承認済</option>
                <option value="rejected">却下</option>
                <option value="cancelled">取消</option>
              </select>
              <span style={{ lineHeight: '36px', color: '#6b7280', fontSize: '0.9rem' }}>
                {filtered.length} 件
              </span>
            </div>

            {/* テーブル */}
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['日時', '名前', 'プロジェクト', 'コース', '金額(¥)', 'ステータス', '振込コード', '操作'].map(h => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left', fontWeight: 600,
                        color: '#374151', whiteSpace: 'nowrap',
                        borderBottom: '2px solid #e5e7eb',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const prjName = projects.find(p => p.id === s.project_id)?.title || `ID:${s.project_id}`;
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '11px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {new Date(s.created_at).toLocaleDateString('ja-JP')}
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '11px 14px', color: '#374151' }}>{prjName}</td>
                        <td style={{ padding: '11px 14px', color: '#6b7280' }}>{s.tier || '-'}</td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1a3a5c' }}>
                          ¥{resolveAmount(s).toLocaleString()}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
                            background: statusColor(s.status) + '20',
                            color: statusColor(s.status), fontWeight: 600, fontSize: '0.82rem',
                          }}>
                            {statusLabel(s.status)}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontFamily: 'monospace', color: '#374151' }}>
                          {s.transfer_code || '-'}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {!isApproved(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'approved')} style={btnStyle('#16a34a')}>承認</button>
                            )}
                            {!isRejected(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'rejected')} style={btnStyle('#dc2626')}>却下</button>
                            )}
                            {!isCancelled(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'cancelled')} style={btnStyle('#6b7280')}>取消</button>
                            )}
                            <button
                              onClick={() => deleteSupporter(s.id)}
                              disabled={deletingId === s.id}
                              style={btnStyle('#ef4444', deletingId === s.id)}
                            >
                              {deletingId === s.id ? '削除中...' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* プロジェクトタブ */}
        {!loading && tab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href="/admin/project-edit" style={{
                background: '#1a3a5c', color: 'white', padding: '10px 20px',
                borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
              }}>
                ＋ 新規プロジェクト
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {projects.map(p => (
                <div key={p.id} style={{
                  background: 'white', borderRadius: '12px', padding: '20px',
                  boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
                }}>
                  <h3 style={{ margin: '0 0 8px', color: '#1a3a5c', fontSize: '1rem', fontWeight: 700 }}>{p.title}</h3>
                  <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.85rem' }}>
                    目標: ¥{(p.goal_amount || 0).toLocaleString()}
                  </p>
                  <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    ステータス: <strong>{p.status}</strong>
                  </p>
                  <Link href={`/admin/project-edit?id=${p.id}`} style={{
                    display: 'inline-block', background: '#1a3a5c', color: 'white',
                    padding: '8px 16px', borderRadius: '6px', textDecoration: 'none',
                    fontSize: '0.88rem', fontWeight: 600,
                  }}>
                    編集
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    padding: '4px 10px', background: disabled ? '#e5e7eb' : color + '15',
    color: disabled ? '#9ca3af' : color, border: `1px solid ${disabled ? '#e5e7eb' : color + '40'}`,
    borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
  };
}