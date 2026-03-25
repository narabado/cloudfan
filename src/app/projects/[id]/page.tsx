'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Tier {
  id: string;
  name: string;
  amount: number;
  description: string;
  limit: number | null;
  remaining: number | null;
}

// supporters テーブルの実際のカラム名（日本語）に合わせた型
interface Supporter {
  id: string;
  名前: string | null;
  ステータス: string;
  total_amount: number;
  メッセージ: string | null;
  タイムスタンプ: string | null;
  created_at: string | null;
  project_id: number;
  ティア: string | null;
}

interface Project {
  id: number;
  title: string;
  school: string;
  club: string;
  region: string;
  description: string;
  story: string | null;
  goal: number;
  deadline: string | null;
  images: string[];
  youtube_url: string | null;
  tiers: Tier[] | null;
  status: string;
}

interface TierComment {
  tierId: string;
  name: string;
  comment: string;
}

function calcDaysLeft(deadline: string | null): { text: string; color: string } {
  if (!deadline || deadline.trim() === '') return { text: '期限未設定', color: '#94a3b8' };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { text: '期限未設定', color: '#94a3b8' };
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return { text: '終了', color: '#ef4444' };
  if (diff === 0) return { text: '本日終了', color: '#f97316' };
  if (diff <= 7) return { text: `残り ${diff} 日`, color: '#f97316' };
  return { text: `残り ${diff} 日`, color: '#059669' };
}

function getStatusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case '募集中': return { label: '🟢 募集中', bg: '#dcfce7', color: '#166534' };
    case '終了':   return { label: '🔴 終了',   bg: '#fee2e2', color: '#991b1b' };
    case '達成':   return { label: '🏆 達成',   bg: '#fef9c3', color: '#854d0e' };
    default:       return { label: status,      bg: '#f1f5f9', color: '#475569' };
  }
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject]     = useState<Project | null>(null);
  const [tiers, setTiers]         = useState<Tier[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'tiers' | 'supporters'>('story');
  const [copied, setCopied]       = useState(false);
  const [tierComments, setTierComments] = useState<TierComment[]>([]);
  const [newComment, setNewComment]     = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      // プロジェクト取得
      const { data: proj, error: pErr } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !proj) {
        setError('プロジェクトが見つかりません');
        setLoading(false);
        return;
      }
      setProject(proj as Project);

      // ティア取得
      const { data: tierRows } = await supabase
        .from('project_tiers')
        .select('*')
        .eq('project_id', id)
        .order('amount', { ascending: true });
      if (tierRows && tierRows.length > 0) {
        setTiers(tierRows as Tier[]);
      } else if (Array.isArray(proj.tiers)) {
        setTiers(proj.tiers as Tier[]);
      }

      // 支援者取得（実際のカラム名で取得）
      const { data: supRows, error: sErr } = await supabase
        .from('supporters')
        .select('id, 名前, ステータス, total_amount, メッセージ, created_at, タイムスタンプ, project_id, ティア')
        .eq('project_id', Number(id))
        .order('created_at', { ascending: false });

      if (sErr) {
        console.error('supporters fetch error:', sErr.message);
      }

      if (supRows) {
        setSupporters(supRows as Supporter[]);
        const total = supRows.reduce(
          (sum: number, r: { total_amount: unknown }) => sum + (Number(r.total_amount) || 0),
          0
        );
        setTotalRaised(total);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏸</div>
        <p style={{ color: '#1a2e4a', fontWeight: 700 }}>読み込み中…</p>
      </div>
    </div>
  );

  if (error || !project) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ef4444' }}>{error || 'エラーが発生しました'}</p>
    </div>
  );

  const imgs = Array.isArray(project.images)
    ? project.images.filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    : [];
  const heroImage   = imgs[0] || null;
  const storyImages = imgs.slice(1);

  const storyParts  = (project.story || '').split('---').map(s => s.trim()).filter(Boolean);
  const storyBlocks = [0, 1, 2].map(i => ({
    text:  storyParts[i]  || '',
    image: storyImages[i] || '',
  })).filter(b => b.text || b.image);

  const ytId       = project.youtube_url ? getYouTubeId(project.youtube_url) : null;
  const days       = calcDaysLeft(project.deadline);
  const statusBadge = getStatusBadge(project.status);
  const progressPct = project.goal > 0
    ? Math.min(100, Math.round((totalRaised / project.goal) * 100))
    : 0;

  // 上位ティア（支援者の「ティア」列でカウント → 金額順）
  const tierSupportCount: Record<string, number> = {};
  for (const s of supporters) {
    const key = s.ティア || '';
    if (key) tierSupportCount[key] = (tierSupportCount[key] || 0) + 1;
  }
  const rankedTiers = [...tiers].sort((a, b) => {
    const ca = tierSupportCount[a.name] || 0;
    const cb = tierSupportCount[b.name] || 0;
    return cb !== ca ? cb - ca : b.amount - a.amount;
  });
  const topCount = rankedTiers.length <= 3
    ? rankedTiers.length
    : Math.min(5, rankedTiers.length);
  const topTiers = rankedTiers.slice(0, topCount);

  const tierColors = ['#2563eb', '#059669', '#d97706', '#9333ea', '#dc2626'];

  const addComment = (tierId: string) => {
    const text = (newComment[tierId] || '').trim();
    if (!text) return;
    setTierComments(prev => [{ tierId, name: '匿名', comment: text }, ...prev]);
    setNewComment(prev => ({ ...prev, [tierId]: '' }));
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '10px 24px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: '8px 8px 0 0',
    background: activeTab === tab ? '#1a2e4a' : '#f1f5f9',
    color: activeTab === tab ? '#fff' : '#64748b',
    transition: 'all 0.2s',
  });

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@700&display=swap"
        rel="stylesheet"
      />
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

        {/* NavBar */}
        <nav style={{ background: '#1a2e4a', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="ならバド" style={{ height: 36 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>CloudFan</span>
          </Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/projects" style={{ color: 'rgba(255,255,255,0.85)', padding: '8px 16px', fontSize: 14, textDecoration: 'none' }}>支援する</Link>
            <Link href="/admin"    style={{ color: 'rgba(255,255,255,0.85)', padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>管理</Link>
          </div>
        </nav>

        {/* ヒーロー画像 */}
        {heroImage && (
          <div style={{ width: '100%', height: 360, overflow: 'hidden', position: 'relative' }}>
            <img src={heroImage} alt="hero"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            <div style={{
              position: 'absolute', top: 16, right: 16,
              padding: '6px 16px', borderRadius: 20,
              background: statusBadge.bg, color: statusBadge.color,
              fontWeight: 700, fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {statusBadge.label}
            </div>
          </div>
        )}

        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '24px 16px',
          display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32,
        }}>

          {/* ── 左コンテンツ ── */}
          <div>
            {/* タグ + ステータス */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[project.school, project.club, project.region].filter(Boolean).map((t, i) => (
                <span key={i} style={{ background: '#e8f4fd', color: '#1a56db', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t}</span>
              ))}
              {!heroImage && (
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: statusBadge.bg, color: statusBadge.color }}>
                  {statusBadge.label}
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 26, color: '#0f172a', marginBottom: 12, lineHeight: 1.5 }}>
              {project.title}
            </h1>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.9, marginBottom: 20 }}>
              {project.description}
            </p>

            {/* 締切日 */}
            {project.deadline && (
              <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>📅</span>
                <span style={{ color: '#166534', fontSize: 14, fontWeight: 700 }}>
                  締切: {new Date(project.deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span style={{ color: days.color, fontWeight: 700, fontSize: 14 }}>（{days.text}）</span>
              </div>
            )}

            {/* SNSシェア */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={copyUrl}
                style={{ padding: '6px 16px', background: copied ? '#059669' : '#1a2e4a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                {copied ? '✅ コピー済み' : '🔗 URLをコピー'}
              </button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '6px 16px', background: '#000', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                𝕏 シェア
              </a>
              <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '6px 16px', background: '#00b900', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                LINE
              </a>
            </div>

            {/* タブ */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #1a2e4a', marginBottom: 0 }}>
              {(['story', 'tiers', 'supporters'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                  {{ story: '📖 ストーリー', tiers: '🎁 支援プラン', supporters: '👥 支援者' }[tab]}
                </button>
              ))}
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: '0 8px 8px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', minHeight: 200 }}>

              {/* ── ストーリー ── */}
              {activeTab === 'story' && (
                <div>
                  {storyBlocks.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center' }}>ストーリーはまだ登録されていません。</p>
                  )}
                  {storyBlocks.map((block, i) => (
                    <div key={i} style={{ marginBottom: 40, paddingBottom: 32, borderBottom: i < storyBlocks.length - 1 ? '2px dashed #e2e8f0' : 'none' }}>
                      <h3 style={{ fontFamily: "'Noto Serif JP', serif", background: '#1a2e4a', color: '#fff', padding: '10px 18px', borderRadius: 8, marginBottom: 20, fontSize: 17 }}>
                        {['第1章', '第2章', '第3章'][i] || `第${i + 1}章`}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: block.image ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
                        <p style={{ color: '#334155', fontSize: 15, lineHeight: 2.1, margin: 0, whiteSpace: 'pre-wrap' }}>{block.text}</p>
                        {block.image && (
                          <img src={block.image} alt={`story-${i}`}
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} />
                        )}
                      </div>
                    </div>
                  ))}
                  {ytId && (
                    <div style={{ marginTop: 24 }}>
                      <h3 style={{ color: '#1a2e4a', marginBottom: 12 }}>🎬 動画</h3>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${ytId}`}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 8 }}
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 支援プラン（上位ティア） ── */}
              {activeTab === 'tiers' && (
                <div>
                  <div style={{ marginBottom: 16, padding: '10px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                    <p style={{ margin: 0, color: '#1e40af', fontSize: 13, fontWeight: 700 }}>
                      🏆 支援が集まりやすい上位{topCount}プランを表示しています
                    </p>
                  </div>
                  {topTiers.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center' }}>支援プランはまだ登録されていません。</p>
                  )}
                  {topTiers.map((tier, i) => {
                    const c = tierColors[i] || '#1a56db';
                    const sCount = tierSupportCount[tier.name] || 0;
                    const comments = tierComments.filter(t => t.tierId === tier.id);
                    return (
                      <div key={tier.id} style={{ marginBottom: 28, border: `2px solid ${c}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                        <div style={{ background: c, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                              {i + 1}
                            </span>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{tier.name}</span>
                          </div>
                          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>¥{tier.amount.toLocaleString()}</span>
                        </div>
                        <div style={{ padding: '16px 18px', background: '#fff' }}>
                          <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{tier.description}</p>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                            <span>👥 {sCount}人が支援</span>
                            {tier.limit != null && <span>📦 残り {tier.remaining ?? tier.limit} 枠</span>}
                          </div>
                          <button
                            disabled={project.status === '終了'}
                            style={{ width: '100%', padding: '11px', background: project.status === '終了' ? '#94a3b8' : c, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: project.status === '終了' ? 'not-allowed' : 'pointer' }}>
                            {project.status === '終了' ? '募集終了' : 'このプランで支援する'}
                          </button>

                          {/* コメント */}
                          <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>💬 応援コメント ({comments.length})</p>
                            {comments.map((cm, ci) => (
                              <div key={ci} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, fontSize: 13, color: '#334155' }}>
                                <strong>{cm.name}</strong>: {cm.comment}
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                value={newComment[tier.id] || ''}
                                onChange={e => setNewComment(p => ({ ...p, [tier.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') addComment(tier.id); }}
                                placeholder="応援メッセージを入力…"
                                style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
                              />
                              <button onClick={() => addComment(tier.id)}
                                style={{ padding: '8px 16px', background: c, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                                送信
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── 支援者 ── */}
              {activeTab === 'supporters' && (
                <div>
                  {supporters.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center' }}>まだ支援者はいません。最初の支援者になりましょう！</p>
                  )}
                  {supporters.map(s => (
                    <div key={s.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f4fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏸</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1a2e4a', fontSize: 14 }}>
                            {s.名前 || '名前未設定'}
                          </span>
                          <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 15 }}>
                            ¥{(Number(s.total_amount) || 0).toLocaleString()}
                          </span>
                        </div>
                        {s.メッセージ && (
                          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0', lineHeight: 1.7 }}>{s.メッセージ}</p>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('ja-JP') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 右サイドバー ── */}
          <div>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'sticky', top: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>達成率</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#1a2e4a' }}>{progressPct}%</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #2563eb, #059669)', borderRadius: 4, transition: 'width 0.8s ease' }} />
                </div>
              </div>

              <div style={{ fontSize: 28, fontWeight: 800, color: '#1a2e4a', marginBottom: 4 }}>
                ¥{totalRaised.toLocaleString()}
              </div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                目標: ¥{project.goal.toLocaleString()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>{supporters.length}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>支援者数</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: days.color }}>{days.text}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>残り期間</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ padding: '6px 20px', borderRadius: 20, fontWeight: 800, fontSize: 14, background: statusBadge.bg, color: statusBadge.color }}>
                  {statusBadge.label}
                </span>
              </div>

              <button
                onClick={() => setActiveTab('tiers')}
                disabled={project.status === '終了'}
                style={{ width: '100%', padding: 14, marginBottom: 12, background: project.status === '終了' ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1a2e4a)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: project.status === '終了' ? 'not-allowed' : 'pointer' }}>
                {project.status === '終了' ? '募集終了' : '🏸 支援する'}
              </button>

              <button
                onClick={() => setActiveTab('tiers')}
                style={{ width: '100%', padding: 10, background: '#f8fafc', color: '#2563eb', border: '2px solid #2563eb', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                支援プランを見る
              </button>

              <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, textAlign: 'center' }}>シェアして応援！</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={copyUrl}
                    style={{ padding: '6px 14px', background: copied ? '#059669' : '#f1f5f9', color: copied ? '#fff' : '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {copied ? '✅' : '🔗'} コピー
                  </button>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding: '6px 14px', background: '#000', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>
                    𝕏
                  </a>
                  <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding: '6px 14px', background: '#00b900', color: '#fff', borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>
                    LINE
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
