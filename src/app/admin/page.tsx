'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ── 型定義 ──
type Supporter = {
  id: number;
  project_id: number;
  project_title: string;
  name: string;
  email: string;
  tier: string;
  units: number;
  total_amount: number;
  transfer_code: string;
  status: string;
  message: string;
  created_at: string;
};

type Project = {
  id: number;
  school: string;
  club: string;
  title: string;
  status: string;
  images: string[];
};

const ADMIN_PASSWORD = 'NBD3890';

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [pwInput, setPwInput]     = useState('');
  const [pwError, setPwError]     = useState('');

  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [projectFilter, setProjectFilter] = useState<number|'all'>('all');
  const [activeTab, setActiveTab]   = useState<'supporters'|'projects'>('supporters');

  useEffect(() => {
    // セッションストレージで認証状態を保持
    if (sessionStorage.getItem('admin_authed') === 'true') setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true');
      setAuthed(true);
    } else {
      setPwError('パスワードが違います');
      setPwInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authed');
    setAuthed(false);
    setPwInput('');
  };

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sups }, { data: projs }] = await Promise.all([
      supabase.from('supporters').select('*').order('created_at', { ascending: false }),
      supabase.from('crowdfunding_projects').select('id,school,club,title,status,images').order('id'),
    ]);
    setSupporters(sups ?? []);
    setProjects(projs ?? []);
    setLoading(false);
  };

  const updateStatus = async (id: number, newStatus: 'approved'|'rejected') => {
    const { error } = await supabase.from('supporters').update({ status: newStatus }).eq('id', id);
    if (error) { alert('更新に失敗しました'); return; }
    fetchAll();
  };

  const cancelSupporter = async (id: number) => {
    if (!confirm('この支援者を取消しますか？')) return;
    await supabase.from('supporters').update({ status: 'cancelled' }).eq('id', id);
    fetchAll();
  };

  const filtered = supporters.filter(s => {
    const statusOk  = filter === 'all'        ? true : s.status     === filter;
    const projectOk = projectFilter === 'all' ? true : s.project_id === projectFilter;
    return statusOk && projectOk;
  });

  const totalAmount  = supporters.filter(s => s.status === 'approved').reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
  const pendingCount = supporters.filter(s => s.status === 'pending').length;

  // ────────────────────────────
  // パスワード画面
  // ────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '100%', maxWidth: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
          <h2 style={{ color: '#1a3a5c', marginBottom: '0.5rem' }}>管理画面</h2>
          <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            パスワードを入力してください
          </p>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="パスワード"
            style={{ width: '100%', padding: '0.9rem', borderRadius: '8px',
                     border: pwError ? '2px solid #e55' : '1px solid #ddd',
                     fontSize: '1rem', marginBottom: '0.75rem', boxSizing: 'border-box',
                     textAlign: 'center', letterSpacing: '0.2em' }}
          />
          {pwError && (
            <div style={{ color: '#e55', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              ❌ {pwError}
            </div>
          )}
          <button onClick={handleLogin} style={{
            width: '100%', padding: '0.9rem', background: '#1a3a5c',
            color: '#fff', border: 'none', borderRadius: '8px',
            fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
          }}>
            ログイン
          </button>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/" style={{ color: '#888', fontSize: '0.85rem', textDecoration: 'none' }}>
              ← サイトへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────
  // 管理画面本体
  // ────────────────────────────
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* ヘッダー */}
      <nav style={{ background: 'linear-gradient(135deg, #1a3a5c, #2d6a9f)', color: '#fff',
                    padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>⛅ CloudFan 管理画面</div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/admin/project-edit" style={{ padding: '0.4rem 1rem', background: '#f0a500',
                color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 'bold' }}>
            ＋ 新規プロジェクト
          </Link>
          <Link href="/" style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>
            🏠 サイトへ戻る
          </Link>
          <button onClick={handleLogout} style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.15)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px',
                fontSize: '0.85rem', cursor: 'pointer' }}>
            🔓 ログアウト
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: '総支援金額（承認済）', value: `¥${totalAmount.toLocaleString()}`, color: '#2d6a9f' },
            { label: '全支援者数',           value: `${supporters.length}名`,           color: '#28a745' },
            { label: '承認待ち',             value: `${pendingCount}件`,                color: pendingCount > 0 ? '#e55' : '#888' },
            { label: 'プロジェクト数',       value: `${projects.length}件`,             color: '#f0a500' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: '10px', padding: '1.25rem',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color }}>{value}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* タブ */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'supporters', label: '👥 支援者管理' },
            { key: 'projects',   label: '🏆 プロジェクト管理' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)} style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === key ? '#1a3a5c' : '#e0e0e0',
              color: activeTab === key ? '#fff' : '#333', fontWeight: 'bold',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 支援者管理 ── */}
        {activeTab === 'supporters' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <select value={projectFilter}
                onChange={e => setProjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                <option value="all">全プロジェクト</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.school} {p.club}</option>
                ))}
              </select>
              {(['all','pending','approved','rejected'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: filter === f ? '#1a3a5c' : '#e0e0e0',
                  color: filter === f ? '#fff' : '#333',
                }}>
                  {f==='all' ? 'すべて' : f==='pending' ? '⏳ 未承認' : f==='approved' ? '✅ 承認済' : '❌ 却下'}
                  {' '}({supporters.filter(s =>
                    (projectFilter==='all' || s.project_id===projectFilter) &&
                    (f==='all' ? true : s.status===f)).length})
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>該当する支援者がいません</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff',
                                borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <thead>
                    <tr style={{ background: '#1a3a5c', color: '#fff' }}>
                      {['日時','プロジェクト','支援者','ティア','金額','振込コード','ステータス','操作'].map(h => (
                        <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const proj = projects.find(p => p.id === s.project_id);
                      return (
                        <tr key={s.id} style={{ background: i%2===0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                            {new Date(s.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                            <div>{proj?.school ?? `ID:${s.project_id}`}</div>
                            <div style={{ color: '#888', fontSize: '0.78rem' }}>{proj?.club}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#888' }}>{s.email}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>{s.tier}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            ¥{s.total_amount?.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#e55' }}>
                            {s.transfer_code}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.82rem',
                              background: s.status==='approved' ? '#d4edda' : s.status==='rejected' ? '#f8d7da' : s.status==='cancelled' ? '#e0e0e0' : '#fff3cd',
                              color: s.status==='approved' ? '#155724' : s.status==='rejected' ? '#721c24' : s.status==='cancelled' ? '#666' : '#856404',
                            }}>
                              {s.status==='approved' ? '✅ 承認済' : s.status==='rejected' ? '❌ 却下' : s.status==='cancelled' ? '取消' : '⏳ 未承認'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {s.status === 'pending' && (
                                <>
                                  <button onClick={() => updateStatus(s.id, 'approved')}
                                    style={{ padding: '0.35rem 0.7rem', background: '#28a745', color: '#fff',
                                             border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }}>
                                    ✅ 承認
                                  </button>
                                  <button onClick={() => updateStatus(s.id, 'rejected')}
                                    style={{ padding: '0.35rem 0.7rem', background: '#dc3545', color: '#fff',
                                             border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }}>
                                    ❌ 却下
                                  </button>
                                </>
                              )}
                              {s.status === 'approved' && (
                                <button onClick={() => cancelSupporter(s.id)}
                                  style={{ padding: '0.35rem 0.7rem', background: '#888', color: '#fff',
                                           border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem' }}>
                                  取消
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── プロジェクト管理 ── */}
        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {projects.map(p => {
              const sups  = supporters.filter(s => s.project_id === p.id && s.status === 'approved');
              const total = sups.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
              const thumb = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: '10px',
                                         boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  {thumb && (
                    <img src={thumb} alt={p.title}
                      style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#1a3a5c' }}>{p.school}</div>
                    <div style={{ color: '#555', marginBottom: '0.5rem' }}>{p.club}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
                                  color: '#888', marginBottom: '1rem' }}>
                      <span>{sups.length}名</span>
                      <span>¥{total.toLocaleString()}</span>
                      <span style={{ color: p.status==='募集中' ? '#28a745' : '#888' }}>{p.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/projects/${p.id}`} style={{
                        flex: 1, padding: '0.5rem', textAlign: 'center',
                        background: '#f0f4f8', color: '#1a3a5c',
                        borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>
                        公開ページ
                      </Link>
                      <Link href={`/admin/project-edit?id=${p.id}`} style={{
                        flex: 1, padding: '0.5rem', textAlign: 'center',
                        background: '#1a3a5c', color: '#fff',
                        borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem' }}>
                        ✏️ 編集
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}