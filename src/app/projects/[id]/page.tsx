'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

interface StoryBlock {
  title: string;
  body: string;
  image_url: string;
}

type Supporter = Record<string, any>;

interface Project {
  id: number;
  title: string;
  school: string;
  club: string;
  region: string;
  description: string;
  story: string | null;
  goal_amount: number;
  deadline: string | null;
  hero_image_url: string | null;
  youtube_url: string | null;
  tiers: Tier[] | null;
  status: string;
}

interface TierComment {
  tierId: string;
  name: string;
  comment: string;
}

const CHAPTER_TITLES = [
  'なぜ支援が必要なのか',
  '私たちの挑戦と夢',
  '支援金の具体的な使い道',
  'あなたの支援で変わること',
  'チームからのメッセージ',
];

function calcDaysLeft(deadline: string | null): { text: string; color: string } {
  if (!deadline || deadline.trim() === '') return { text: '期限未設定', color: '#94a3b8' };
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return { text: '期限未設定', color: '#94a3b8' };
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0)   return { text: '終了',           color: '#ef4444' };
  if (diff === 0) return { text: '本日終了',        color: '#f97316' };
  if (diff <= 7)  return { text: `残り ${diff} 日`, color: '#f97316' };
  return                  { text: `残り ${diff} 日`, color: '#059669' };
}

function getStatusBadge(status: string) {
  if (['募集中', 'active', 'approved'].includes(status))
    return { label: '🟢 募集中', bg: '#dcfce7', color: '#166534' };
  if (['終了', 'closed', 'ended'].includes(status))
    return { label: '🔴 終了', bg: '#fee2e2', color: '#991b1b' };
  if (['準備中', 'preparing'].includes(status))
    return { label: '🟡 準備中', bg: '#fef9c3', color: '#854d0e' };
  return { label: status, bg: '#f1f5f9', color: '#475569' };
}

function isEnded(status: string): boolean {
  return ['終了', 'closed', 'ended'].includes(status);
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseStory(story: string | null): StoryBlock[] {
  if (!story) return [];
  try {
    const parsed = JSON.parse(story);
    if (Array.isArray(parsed)) {
    return parsed.map((b: Record<string, any>) => ({
        title:     String(b['title']     ?? ''),
        body:      String(b['body']      ?? b['text'] ?? ''),
        image_url: String(b['image_url'] ?? b['image'] ?? ''),
      }));
    }
  } catch {
    // JSON でなければ --- 区切りとして処理
    return story.split('---').map((s, i) => ({
      title:     CHAPTER_TITLES[i] ?? `第${i + 1}章`,
      body:      s.trim(),
      image_url: '',
    })).filter(b => b.body);
  }
  return [];
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project,      setProject]      = useState<Project | null>(null);
  const [tiers,        setTiers]        = useState<Tier[]>([]);
  const [supporters,   setSupporters]   = useState<Supporter[]>([]);
  const [totalRaised,  setTotalRaised]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [activeTab,    setActiveTab]    = useState<'story' | 'tiers' | 'supporters' | 'ranking'>('story');
  const [copied,       setCopied]       = useState(false);
  const [tierComments, setTierComments] = useState<TierComment[]>([]);
  const [newComment,   setNewComment]   = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
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
      setProject(proj as unknown as Project);

      const { data: tierRows } = await supabase
        .from('project_tiers')
        .select('*')
        .eq('project_id', id)
        .order('amount', { ascending: true });
      if (tierRows && tierRows.length > 0) {
        setTiers(tierRows as unknown as Tier[]);
      } else if (Array.isArray((proj as unknown as Project).tiers)) {
        setTiers(((proj as unknown as Project).tiers as Tier[]).map((t, i) => ({
          ...t,
          id: t.id ?? String(i),
        })));
      }

      const { data: supRows } = await supabase
        .from('supporters')
        .select('*')
        .eq('project_id', Number(id))
        .in('status', ['approved', 'active'])
        .order('created_at', { ascending: false });

      if (supRows) {
        const rows = supRows as unknown as Supporter[];
        setSupporters(rows);
        const total = rows.reduce(
          (sum, r) => sum + (Number(r['total_amount']) || 0), 0
        );
        setTotalRaised(total);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ color: '#1a2e4a', fontWeight: 700 }}>読み込み中…</p>
      </div>
    </div>
  );
  if (error || !project) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ef4444' }}>{error || 'エラーが発生しました'}</p>
    </div>
  );

  const storyBlocks = parseStory(project.story);
  const ytId        = project.youtube_url ? getYouTubeId(project.youtube_url) : null;
  const days        = calcDaysLeft(project.deadline);
  const statusBadge = getStatusBadge(project.status);
  const ended       = isEnded(project.status);
  const goalAmount  = Number(project.goal_amount) || 0;
  const progressPct = goalAmount > 0
    ? Math.min(100, Math.round((totalRaised / goalAmount) * 100))
    : 0;

  const tierCount: Record<string, number> = {};
  for (const s of supporters) {
    const key = String(s['tier_name'] || '');
    if (key) tierCount[key] = (tierCount[key] || 0) + 1;
  }

  const topTiers   = tiers.slice(0, Math.min(5, tiers.length));
  const tierColors = ['#2563eb', '#059669', '#d97706', '#9333ea', '#dc2626'];

  const rankedSupporters = [...supporters].sort(
    (a, b) => (Number(b['total_amount']) || 0) - (Number(a['total_amount']) || 0)
  );
  const rankMedals = ['🥇', '🥈', '🥉'];

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
    padding: '12px 20px',
    border: activeTab === tab ? 'none' : '2px solid #e2e8f0',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
    borderRadius: '10px 10px 0 0',
    background: activeTab === tab ? 'linear-gradient(135deg, #1a2e4a, #2563eb)' : '#fff',
    color: activeTab === tab ? '#fff' : '#64748b',
    transition: 'all 0.2s',
    boxShadow: activeTab === tab ? '0 -3px 12px rgba(37,99,235,0.3)' : 'none',
    transform: activeTab === tab ? 'translateY(-2px)' : 'none',
    position: 'relative' as const,
    zIndex: activeTab === tab ? 2 : 1,
  });

  return (
    <>
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

        <nav style={{
          background: '#1a2e4a', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="CloudFan" style={{ height: 36 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>CloudFan</span>
          </Link>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/" style={{
              color: '#fff', padding: '8px 18px', fontSize: 14, textDecoration: 'none',
              border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8,
              fontWeight: 700, background: 'rgba(255,255,255,0.08)',
            }}>← トップへ戻る</Link>
            <Link href="/admin" style={{
              color: '#1a2e4a', padding: '8px 18px', fontSize: 13, textDecoration: 'none',
              background: '#d4af37', borderRadius: 8, fontWeight: 700,
            }}>管理</Link>
          </div>
        </nav>

        {project.hero_image_url && (
          <div style={{ width: '100%', height: 360, overflow: 'hidden', position: 'relative' }}>
            <img src={project.hero_image_url} alt="hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)' }} />
            <div style={{
              position: 'absolute', top: 16, right: 16, padding: '6px 16px',
              borderRadius: 20, background: statusBadge.bg, color: statusBadge.color,
              fontWeight: 700, fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>{statusBadge.label}</div>
          </div>
        )}

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {([project.school, project.club, project.region] as string[]).filter(Boolean).map((t, i) => (
                <span key={i} style={{ background: '#e8f4fd', color: '#1a56db', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{t}</span>
              ))}
              {!project.hero_image_url && (
                <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: statusBadge.bg, color: statusBadge.color }}>{statusBadge.label}</span>
              )}
            </div>

            <h1 style={{ fontSize: 26, color: '#0f172a', marginBottom: 12, lineHeight: 1.5, fontWeight: 900 }}>{project.title}</h1>
            <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.9, marginBottom: 20 }}>{project.description}</p>

            {project.deadline && (
              <div style={{ marginBottom: 16, padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>📅</span>
                <span style={{ color: '#166534', fontSize: 14, fontWeight: 700 }}>
                  締切: {new Date(project.deadline).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span style={{ color: days.color, fontWeight: 700, fontSize: 14 }}>（{days.text}）</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
              <button onClick={copyUrl} style={{ padding: '8px 18px', background: copied ? '#059669' : '#1a2e4a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                {copied ? '✅ コピー完了' : '🔗 URLをコピー'}
              </button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '8px 18px', background: '#000', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 700 }}>𝕏 シェア</a>
              <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank" rel="noreferrer"
                style={{ padding: '8px 18px', background: '#00b900', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 700 }}>LINE</a>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 0, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {([
                { key: 'story',      label: '📖 ストーリー' },
                { key: 'tiers',      label: '💎 支援プラン' },
                { key: 'supporters', label: '👥 支援者' },
                { key: 'ranking',    label: '🏆 ランキング' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{
              background: '#fff', padding: 28,
              borderRadius: '0 8px 8px 8px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.08)', minHeight: 200,
              border: '1px solid #e2e8f0',
            }}>

              {activeTab === 'story' && (
                <div>
                  {storyBlocks.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>ストーリーはまだ登録されていません。</p>
                  )}
                  {storyBlocks.map((block, i) => (
                    <div key={i} style={{ marginBottom: 48, paddingBottom: 40, borderBottom: i < storyBlocks.length - 1 ? '2px dashed #e2e8f0' : 'none' }}>
                      <h3 style={{
                        background: 'linear-gradient(135deg, #1a2e4a, #2563eb)',
                        color: '#fff', padding: '12px 20px',
                        borderRadius: 10, marginBottom: 20, fontSize: 16,
                        fontWeight: 800,
                      }}>{block.title || CHAPTER_TITLES[i] || `第${i + 1}章`}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: block.image_url ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
                        <p style={{ color: '#334155', fontSize: 15, lineHeight: 2.1, margin: 0, whiteSpace: 'pre-wrap' }}>{block.body}</p>
                        {block.image_url && (
                          <img src={block.image_url} alt={`story-${i}`}
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                        )}
                      </div>
                    </div>
                  ))}
                  {ytId && (
                    <div style={{ marginTop: 32 }}>
                      <h3 style={{ color: '#1a2e4a', marginBottom: 12, fontWeight: 800 }}>▶️ 紹介動画</h3>
                      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                        <iframe src={`https://www.youtube.com/embed/${ytId}`}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 10 }}
                          allowFullScreen />
                      </div>
                    </div>
                  )}
                  {!ended && (
                    <div style={{ marginTop: 40, padding: 24, background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)', borderRadius: 12, textAlign: 'center', border: '1px solid #bfdbfe' }}>
                      <p style={{ color: '#1a2e4a', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>⏳ このプロジェクトを応援しませんか？</p>
                      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>あなたの支援が選手たちの夢を実現します。</p>
                      <button onClick={() => setActiveTab('tiers')} style={{
                        padding: '14px 48px',
                        background: 'linear-gradient(135deg, #d4af37, #f5d060)',
                        color: '#1a2e4a', border: 'none', borderRadius: 40,
                        fontWeight: 800, fontSize: 16, cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
                      }}>💎 支援プランを見る →</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tiers' && (
                <div>
                  {topTiers.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>支援プランはまだ登録されていません。</p>
                  )}
                  {topTiers.map((tier, i) => {
                    const c = tierColors[i] || '#1a56db';
                    const sCount = tierCount[tier.name] || 0;
                    const tierId = String(tier.id ?? i);
                    const comments = tierComments.filter(t => t.tierId === tierId);
                    return (
                      <div key={tierId} style={{ marginBottom: 28, border: `2px solid ${c}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                        <div style={{ background: c, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{i + 1}</span>
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{tier.name}</span>
                          </div>
                          <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>¥{(Number(tier.amount) || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ padding: '18px 20px', background: '#fff' }}>
                          <p style={{ color: '#334155', fontSize: 14, lineHeight: 1.9, marginBottom: 14 }}>{tier.description}</p>
                          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b', marginBottom: 18 }}>
                            <span>👥 {sCount}人が支援</span>
                            {tier.limit != null && <span>📦 残り {tier.remaining ?? tier.limit} 枠</span>}
                          </div>
                          <button
                            disabled={ended}
                            onClick={() => { if (!ended) router.push(`/projects/${id}/support?tier=${tierId}`); }}
                            style={{
                              width: '100%', padding: 13,
                              background: ended ? '#94a3b8' : `linear-gradient(135deg, ${c}, ${c}dd)`,
                              color: '#fff', border: 'none', borderRadius: 10,
                              fontWeight: 800, fontSize: 15, cursor: ended ? 'not-allowed' : 'pointer',
                              boxShadow: ended ? 'none' : `0 4px 14px ${c}55`,
                            }}>{ended ? '募集終了' : `💎 ¥${(Number(tier.amount) || 0).toLocaleString()}で支援する`}</button>
                          <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 700 }}>💬 応援コメント ({comments.length})</p>
                            {comments.map((cm, ci) => (
                              <div key={ci} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, fontSize: 13, color: '#334155' }}>
                                <strong>{cm.name}</strong>: {cm.comment}
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input value={newComment[tierId] || ''}
                                onChange={e => setNewComment(p => ({ ...p, [tierId]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') addComment(tierId); }}
                                placeholder="応援メッセージを入力…"
                                style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
                              <button onClick={() => addComment(tierId)}
                                style={{ padding: '9px 18px', background: c, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>送信</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'supporters' && (
                <div>
                  <div style={{ marginBottom: 20, padding: '12px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                    <p style={{ margin: 0, color: '#166534', fontSize: 14, fontWeight: 800 }}>🎉 {supporters.length}人がこのプロジェクトを支援しています</p>
                  </div>
                  {supporters.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>まだ支援者がいません。最初の支援者になりましょう！</p>
                  )}
                  {supporters.map((s, idx) => (
                    <div key={String(s['id'] || idx)} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #f1f5f9', alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1a2e4a, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⭐</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1a2e4a', fontSize: 14 }}>{String(s['name'] || s['名前'] || '名前未設定')}</span>
                          <span style={{ color: '#2563eb', fontWeight: 800, fontSize: 16 }}>¥{(Number(s['total_amount']) || 0).toLocaleString()}</span>
                        </div>
                        {s['message'] && (
                          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0', lineHeight: 1.7 }}>{String(s['message'])}</p>
                        )}
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>
                          {s['created_at'] ? new Date(String(s['created_at'])).toLocaleDateString('ja-JP') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ranking' && (
                <div>
                  <div style={{ marginBottom: 24, padding: '14px 18px', background: 'linear-gradient(135deg, #fef9c3, #fef3c7)', borderRadius: 10, border: '1px solid #fde68a', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: '#92400e', fontSize: 15, fontWeight: 800 }}>🏆 支援者ランキング（支援金額順）</p>
                  </div>
                  {rankedSupporters.length === 0 && (
                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>まだ支援者がいません。</p>
                  )}
                  {rankedSupporters.map((s, idx) => {
                    const amount = Number(s['total_amount']) || 0;
                    const isTop3 = idx < 3;
                    return (
                      <div key={String(s['id'] || idx)} style={{
                        display: 'flex', gap: 16, padding: '16px 20px', marginBottom: 12,
                        borderRadius: 12, alignItems: 'center',
                        background: isTop3
                          ? idx === 0 ? 'linear-gradient(135deg, #fef9c3, #fef3c7)'
                          : idx === 1 ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
                          : 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                          : '#f8fafc',
                        border: isTop3
                          ? idx === 0 ? '2px solid #fbbf24'
                          : idx === 1 ? '2px solid #94a3b8'
                          : '2px solid #fb923c'
                          : '1px solid #e2e8f0',
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                          background: isTop3
                            ? idx === 0 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                            : idx === 1 ? 'linear-gradient(135deg, #64748b, #94a3b8)'
                            : 'linear-gradient(135deg, #ea580c, #fb923c)'
                            : '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isTop3 ? 24 : 15, fontWeight: 900,
                          color: isTop3 ? '#fff' : '#64748b',
                        }}>
                          {isTop3 ? rankMedals[idx] : `${idx + 1}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#1a2e4a', fontSize: isTop3 ? 16 : 14 }}>
                              {String(s['name'] || s['名前'] || '匿名サポーター')}
                            </span>
                            <span style={{ fontWeight: 900, fontSize: isTop3 ? 22 : 16, color: idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#ea580c' : '#2563eb' }}>
                              ¥{amount.toLocaleString()}
                            </span>
                          </div>
                          {s['message'] && (
                            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0', lineHeight: 1.7 }}>💬 {String(s['message'])}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', position: 'sticky', top: 80, border: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>達成率</span>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#1a2e4a' }}>{progressPct}%</span>
                </div>
                <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #2563eb, #059669)', borderRadius: 5, transition: 'width 1s ease' }} />
                </div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#1a2e4a', marginBottom: 4 }}>¥{totalRaised.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>目標: ¥{goalAmount.toLocaleString()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0369a1' }}>{supporters.length}</div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>支援者数</div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: days.color }}>{days.text}</div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>残り期間</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <span style={{ padding: '8px 24px', borderRadius: 20, fontWeight: 800, fontSize: 14, background: statusBadge.bg, color: statusBadge.color }}>{statusBadge.label}</span>
              </div>
              <button
                onClick={() => !ended && setActiveTab('tiers')}
                disabled={ended}
                style={{
                  width: '100%', padding: '16px 0', marginBottom: 12,
                  background: ended ? '#94a3b8' : 'linear-gradient(135deg, #d4af37, #f5d060)',
                  color: ended ? '#fff' : '#1a2e4a',
                  border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 17,
                  cursor: ended ? 'not-allowed' : 'pointer',
                  boxShadow: ended ? 'none' : '0 6px 20px rgba(212,175,55,0.45)',
                }}>{ended ? '募集終了' : '⭐ 今すぐ支援する'}</button>
              <button onClick={() => setActiveTab('tiers')} style={{
                width: '100%', padding: '12px 0',
                background: '#fff', color: '#2563eb',
                border: '2px solid #2563eb', borderRadius: 12,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>💎 支援プランを見る</button>
              <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, textAlign: 'center', fontWeight: 600 }}>シェアして応援！</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={copyUrl} style={{ padding: '8px 16px', background: copied ? '#059669' : '#f1f5f9', color: copied ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {copied ? '✅' : '🔗'} コピー
                  </button>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding: '8px 16px', background: '#000', color: '#fff', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>𝕏</a>
                  <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank" rel="noreferrer"
                    style={{ padding: '8px 16px', background: '#00b900', color: '#fff', borderRadius: 8, fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>LINE</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
