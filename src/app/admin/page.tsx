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

  // 隱崎ｨｼ繝√ぉ繝・け
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = sessionStorage.getItem(SESSION_KEY);
      if (v === 'true') setAuthed(true);
    }
  }, []);

  // 繝・・繧ｿ蜿門ｾ・
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
      setLoginError('繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・);
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

  function exportCSV(filterStatus: 'all' | 'approved' | 'pending') {
    const statusMap: Record<string, string> = {
      pending: '菫晉蕗荳ｭ', approved: '謇ｿ隱肴ｸ医∩', rejected: '蜊ｴ荳・, cancelled: '繧ｭ繝｣繝ｳ繧ｻ繝ｫ',
    };
    const labelMap = { all: '蜈ｨ莉ｶ', approved: '謇ｿ隱肴ｸ医∩', pending: '菫晉蕗荳ｭ' };
    const target = filterStatus === 'all'
      ? supporters
      : supporters.filter(s => s.status === filterStatus);

    const header = ['豌丞錐', '繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ', '驥鷹｡・, '繧ｹ繝・・繧ｿ繧ｹ', '謖ｯ霎ｼ繧ｳ繝ｼ繝・, '繝励Ο繧ｸ繧ｧ繧ｯ繝・, '謾ｯ謠ｴ譌･', '繧ｳ繝｡繝ｳ繝・];
    const rows = target.map(s => {
      const prjName = projects.find(p => p.id === s.project_id)?.title || `ID:${s.project_id}`;
      const statusJa = statusMap[s.status] || s.status;
      const date = s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP') : '';
      return [
        s.name || '',
        (s as any).email || '',
        String(s.total_amount || 0),
        statusJa,
        (s as any).transfer_code || '',
        prjName,
        date,
        s.message || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
    const filename = `supporters_${labelMap[filterStatus]}_${dateStr}.csv`;
    const bom = '\uFEFF';
    const csv = bom + [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteSupporter(id: number) {
    if (!confirm('縺薙・謾ｯ謠ｴ閠・ｒ螳悟・縺ｫ蜑企勁縺励∪縺吶°・溘％縺ｮ謫堺ｽ懊・蜿悶ｊ豸医○縺ｾ縺帙ｓ縲・)) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/delete-supporter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert('蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ' + (json.error || '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ'));
        return;
      }
      setSupporters(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert('蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
    } finally {
      setDeletingId(null);
    }
  }

  const isApproved = (s: string) => s === 'approved';
  const isPending = (s: string) => s === 'pending';
  const isRejected = (s: string) => s === 'rejected';
  const isCancelled = (s: string) => s === 'cancelled';

  function statusLabel(s: string) {
    if (isApproved(s)) return '謇ｿ隱肴ｸ・;
    if (isPending(s)) return '菫晉蕗荳ｭ';
    if (isRejected(s)) return '蜊ｴ荳・;
    if (isCancelled(s)) return '蜿匁ｶ・;
    return s;
  }

  function statusColor(s: string) {
    if (isApproved(s)) return '#16a34a';
    if (isPending(s)) return '#d97706';
    if (isRejected(s)) return '#dc2626';
    if (isCancelled(s)) return '#6b7280';
    return '#374151';
  }

  // 繝ｭ繧ｰ繧､繝ｳ逕ｻ髱｢
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
            邂｡逅・・Ο繧ｰ繧､繝ｳ
          </h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '28px', fontSize: '0.9rem' }}>
            Sports Support Hokkaido
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉・
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
            繝ｭ繧ｰ繧､繝ｳ
          </button>
        </div>
      </div>
    );
  }

  // 繝輔ぅ繝ｫ繧ｿ繝ｼ貂医∩繝ｪ繧ｹ繝・
  const filtered = supporters.filter(s => {
    const prjName = projects.find(p => p.id === s.project_id)?.title || '';
    const matchPrj = filterPrj ? prjName.includes(filterPrj) : true;
    const matchSts = filterSts ? s.status === filterSts : true;
    return matchPrj && matchSts;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 繝倥ャ繝繝ｼ */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #0f2540 100%)',
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
          薯 邂｡逅・ム繝・す繝･繝懊・繝・
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          繝ｭ繧ｰ繧｢繧ｦ繝・
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {/* 繧ｿ繝・*/}
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
              {t === 'supporters' ? '則 謾ｯ謠ｴ閠・ｸ隕ｧ' : '刀 繝励Ο繧ｸ繧ｧ繧ｯ繝井ｸ隕ｧ'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</div>
        )}

        {/* 謾ｯ謠ｴ閠・ち繝・*/}
        {!loading && tab === 'supporters' && (
          <div>
            {/* 繝輔ぅ繝ｫ繧ｿ繝ｼ */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                placeholder="繝励Ο繧ｸ繧ｧ繧ｯ繝亥錐縺ｧ邨槭ｊ霎ｼ縺ｿ"
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
                <option value="">蜈ｨ繧ｹ繝・・繧ｿ繧ｹ</option>
                <option value="pending">菫晉蕗荳ｭ</option>
                <option value="approved">謇ｿ隱肴ｸ・/option>
                <option value="rejected">蜊ｴ荳・/option>
                <option value="cancelled">蜿匁ｶ・/option>
              </select>
              <span style={{ lineHeight: '36px', color: '#6b7280', fontSize: '0.9rem' }}>
                {filtered.length} 莉ｶ
              </span>
            </div>

            {/* 繝・・繝悶Ν */}
              {/* CSV繧ｨ繧ｯ繧ｹ繝昴・繝医・繧ｿ繝ｳ */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12 }}>
                <button onClick={() => exportCSV('all')} style={{ padding: '7px 14px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>踏 蜈ｨ莉ｶ CSV</button>
                <button onClick={() => exportCSV('approved')} style={{ padding: '7px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>笨・謇ｿ隱肴ｸ医∩ CSV</button>
                <button onClick={() => exportCSV('pending')} style={{ padding: '7px 14px', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>竢ｳ 菫晉蕗荳ｭ CSV</button>
              </div>
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['譌･譎・, '蜷榊燕', '繝励Ο繧ｸ繧ｧ繧ｯ繝・, '繧ｳ繝ｼ繧ｹ', '驥鷹｡・ﾂ･)', '繧ｹ繝・・繧ｿ繧ｹ', '謖ｯ霎ｼ繧ｳ繝ｼ繝・, '繝｡繝・そ繝ｼ繧ｸ', '謫堺ｽ・].map(h => (
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
                        <td style={{ padding: '11px 14px', fontWeight: 500, color: '#1a2e4a' }}>
                          {s.is_anonymous ? `${s.name}（匿名）` : s.name}
                          {(s as any).is_anonymous && <span style={{ marginLeft: 6, fontSize: 11, background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>蛹ｿ蜷・/span>}
                        </td>
                        <td style={{ padding: '11px 14px', color: '#374151' }}>{prjName}</td>
                        <td style={{ padding: '11px 14px', color: '#6b7280' }}>{s.tier || '-'}</td>
                        <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1a3a5c' }}>
                          ﾂ･{resolveAmount(s).toLocaleString()}
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
                        <td style={{ padding: '11px 14px', color: '#374151', maxWidth: '180px', verticalAlign: 'top' }}>
                          <span style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                            {s.message || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {!isApproved(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'approved')} style={btnStyle('#16a34a')}>謇ｿ隱・/button>
                            )}
                            {!isRejected(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'rejected')} style={btnStyle('#dc2626')}>蜊ｴ荳・/button>
                            )}
                            {!isCancelled(s.status) && (
                              <button onClick={() => updateStatus(s.id, 'cancelled')} style={btnStyle('#6b7280')}>蜿匁ｶ・/button>
                            )}
                            <button
                              onClick={() => deleteSupporter(s.id)}
                              disabled={deletingId === s.id}
                              style={btnStyle('#ef4444', deletingId === s.id)}
                            >
                              {deletingId === s.id ? '蜑企勁荳ｭ...' : '卵・・}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                        繝・・繧ｿ縺後≠繧翫∪縺帙ｓ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 繝励Ο繧ｸ繧ｧ繧ｯ繝医ち繝・*/}
        {!loading && tab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Link href="/admin/project-edit" style={{
                background: '#1a3a5c', color: 'white', padding: '10px 20px',
                borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
              }}>
                ・・譁ｰ隕上・繝ｭ繧ｸ繧ｧ繧ｯ繝・
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
                    逶ｮ讓・ ﾂ･{(p.goal_amount || 0).toLocaleString()}
                  </p>
                  <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    繧ｹ繝・・繧ｿ繧ｹ: <strong>{p.status}</strong>
                  </p>
                  <Link href={`/admin/project-edit?id=${p.id}`} style={{
                    display: 'inline-block', background: '#1a3a5c', color: 'white',
                    padding: '8px 16px', borderRadius: '6px', textDecoration: 'none',
                    fontSize: '0.88rem', fontWeight: 600,
                  }}>
                    邱ｨ髮・
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

