'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Tier {
  id: number;
  name: string;
  amount: number;
  description: string;
  max_supporters?: number;
  current_supporters?: number;
  icon?: string;
  color?: string;
}

interface Supporter {
  id: number;
  name: string;
  amount: number;
  message?: string;
  created_at: string;
  is_anonymous?: boolean;
}

interface Project {
  id: number;
  title: string;
  description: string;
  story?: string;
  goal: number;
  deadline?: string;
  images?: string[];
  youtube_url?: string;
  category?: string;
  tags?: string[];
  tiers?: any[];
}

const TIER_STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  ブロンズ:   { color: '#92400e', bg: '#fef3c7', border: '#d97706', icon: '🥉' },
  シルバー:   { color: '#374151', bg: '#f3f4f6', border: '#9ca3af', icon: '🥈' },
  ゴールド:   { color: '#78350f', bg: '#fffbeb', border: '#f59e0b', icon: '🥇' },
  プラチナ:   { color: '#1e3a5f', bg: '#eff6ff', border: '#3b82f6', icon: '💎' },
  レジェンド: { color: '#4c1d95', bg: '#f5f3ff', border: '#7c3aed', icon: '👑' },
};

function getTierStyle(name: string) {
  const key = Object.keys(TIER_STYLES).find(k => name.includes(k));
  return key ? TIER_STYLES[key] : { color: '#1f2937', bg: '#f9fafb', border: '#e5e7eb', icon: '🎁' };
}

function getYouTubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return match ? match[1] : null;
}

function calcDaysLeft(deadline?: string): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'supporters'>('story');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: proj, error: pe } = await supabase
          .from('crowdfunding_projects')
          .select('*')
          .eq('id', projectId)
          .single();
        if (pe || !proj) throw new Error('プロジェクトが見つかりません');
        setProject(proj);

        const { data: tierData } = await supabase
          .from('project_tiers')
          .select('*')
          .eq('project_id', projectId)
          .order('amount', { ascending: true });

        if (tierData && tierData.length > 0) {
          setTiers(tierData);
        } else if (proj.tiers && Array.isArray(proj.tiers)) {
          setTiers(
            proj.tiers.map((t: any, i: number) => ({
              id: i + 1,
              name: t.name ?? `ティア${i + 1}`,
              amount: t.amount ?? 0,
              description: t.description ?? '',
              max_supporters: t.max_supporters,
              current_supporters: t.current_supporters ?? 0,
              icon: t.icon,
              color: t.color,
            }))
          );
        }

        const { data: supData } = await supabase
          .from('supporters')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (supData) {
          setSupporters(supData);
          setTotalRaised(supData.reduce((s: number, r: any) => s + (r.amount ?? 0), 0));
        }
      } catch (e: any) {
        setError(e.message ?? 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏸</div>
        <p style={{ color: '#1e3a5f', fontWeight: 600 }}>読み込み中...</p>
      </div>
    </div>
  );

  if (error || !project) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error || 'プロジェクトが見つかりません'}</p>
        <Link href="/" style={{ color: '#2563eb' }}>← トップへ戻る</Link>
      </div>
    </div>
  );

  const validImages = (project.images ?? []).filter(u => u && u.trim() !== '');
  const heroImage = validImages[0] ?? null;
  const storyBlocks = (project.story ?? '').split('---').map(s => s.trim()).filter(Boolean);
  const progressPct = project.goal > 0 ? Math.min(100, Math.round((totalRaised / project.goal) * 100)) : 0;
  const daysLeft = calcDaysLeft(project.deadline);
  const projectUrl = `https://cloudfan.vercel.app/projects/${project.id}`;
  const ytId = project.youtube_url ? getYouTubeId(project.youtube_url) : null;

  const copyUrl = () => {
    navigator.clipboard.writeText(projectUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans JP', sans-serif; background: #f0f4f8; color: #1f2937; }
        h1,h2,h3 { font-family: 'Noto Serif JP', serif; }
        a { text-decoration: none; }
        button { cursor: pointer; }
      `}</style>

      {/* ===== HEADER ===== */}
      <header style={{ background: 'linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 60%, #0e4d2f 100%)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="ロゴ" style={{ height: '36px', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
          <Link href="/" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>⛸ CLOUDFAN</Link>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/" style={{ color: '#e2e8f0', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>← トップ</Link>
          <Link href={`/projects/${projectId}/edit`} style={{ color: '#e2e8f0', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px' }}>✏️ 編集</Link>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Project Title */}
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f2d5a', marginBottom: '0.5rem', lineHeight: 1.4 }}>{project.title}</h1>
        {project.category && (
          <span style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.78rem', padding: '0.2rem 0.7rem', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{project.category}</span>
        )}

        {/* Layout: Left content + Right sidebar */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ===== LEFT ===== */}
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>

            {/* Hero Image */}
            {heroImage && (
              <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <img src={heroImage} alt={project.title} style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} />
              </div>
            )}

            {/* Description */}
            <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, marginBottom: '1.5rem', background: '#fff', padding: '1.2rem', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>{project.description}</p>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', gap: '0.5rem' }}>
              {(['story', 'supporters'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.4rem', border: 'none', borderBottom: activeTab === tab ? '3px solid #1d4ed8' : '3px solid transparent', background: 'none', fontWeight: activeTab === tab ? 700 : 400, color: activeTab === tab ? '#1d4ed8' : '#6b7280', fontSize: '0.95rem', transition: 'all 0.2s', fontFamily: '"Noto Sans JP", sans-serif' }}>
                  {tab === 'story' ? '📖 ストーリー' : `👥 支援者 (${supporters.length})`}
                </button>
              ))}
            </div>

            {/* Story Tab */}
            {activeTab === 'story' && (
              <div>
                {/* YouTube */}
                {ytId && (
                  <div style={{ marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                    <iframe width="100%" height="360" src={`https://www.youtube.com/embed/${ytId}`} frameBorder="0" allowFullScreen style={{ display: 'block' }} />
                  </div>
                )}

                {/* Story Blocks */}
                {storyBlocks.length > 0 ? storyBlocks.map((block, i) => {
                  const img = validImages[i] ?? null;
                  return (
                    <div key={i} style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', flexDirection: 'row', alignItems: 'stretch' }}>
                      {img && (
                        <div style={{ flex: '0 0 280px', maxWidth: '280px' }}>
                          <img src={img} alt={`ストーリー画像${i + 1}`} style={{ width: '100%', height: '100%', minHeight: '200px', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center' }}>
                        <p style={{ fontSize: '1rem', lineHeight: 1.9, color: '#374151', whiteSpace: 'pre-wrap' }}>{block}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <p style={{ lineHeight: 1.9, color: '#374151', whiteSpace: 'pre-wrap' }}>{project.story}</p>
                  </div>
                )}
              </div>
            )}

            {/* Supporters Tab */}
            {activeTab === 'supporters' && (
              <div>
                {supporters.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>まだ支援者はいません。最初の支援者になりましょう！</div>
                ) : supporters.map(s => (
                  <div key={s.id} style={{ background: '#fff', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', display: 'flex', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #0e4d2f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {s.is_anonymous ? '?' : (s.name?.[0] ?? '?')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 600 }}>{s.is_anonymous ? '匿名' : s.name}</span>
                        <span style={{ color: '#1d4ed8', fontWeight: 700 }}>¥{s.amount.toLocaleString()}</span>
                      </div>
                      {s.message && <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 }}>{s.message}</p>}
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>{new Date(s.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tiers */}
            <div style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f2d5a', marginBottom: '1.2rem', paddingBottom: '0.5rem', borderBottom: '2px solid #dbeafe' }}>🎁 支援ティア・特典</h2>
              {tiers.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>ティア情報が設定されていません</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {tiers.map(tier => {
                    const style = getTierStyle(tier.name);
                    const remaining = tier.max_supporters != null ? tier.max_supporters - (tier.current_supporters ?? 0) : null;
                    return (
                      <div key={tier.id} style={{ background: style.bg, border: `2px solid ${style.border}`, borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', transition: 'transform 0.2s, box-shadow 0.2s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{tier.icon ?? style.icon}</span>
                          <span style={{ fontWeight: 700, color: style.color, fontSize: '1rem' }}>{tier.name}</span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: style.color }}>¥{tier.amount.toLocaleString()}</div>
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.7 }}>{tier.description}</p>
                        {remaining !== null && (
                          <p style={{ fontSize: '0.8rem', color: remaining <= 5 ? '#dc2626' : '#6b7280', fontWeight: remaining <= 5 ? 700 : 400 }}>
                            残り {remaining} 枠 / {tier.max_supporters} 枠
                          </p>
                        )}
                        <button
                          onClick={() => router.push(`/support/${projectId}?tier=${tier.id}`)}
                          style={{ marginTop: 'auto', padding: '0.6rem 1rem', background: style.border, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', fontFamily: '"Noto Sans JP", sans-serif' }}>
                          このティアで支援する
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT SIDEBAR ===== */}
          <div style={{ flex: '0 0 300px', position: 'sticky', top: '80px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '2px solid #dbeafe' }}>

              {/* Amount */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f2d5a', fontFamily: '"Noto Serif JP", serif' }}>
                  ¥{totalRaised.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  目標: ¥{project.goal.toLocaleString()}
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #1e3a5f, #2563eb)', borderRadius: '999px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{progressPct}% 達成</span>
                  <span style={{ color: '#6b7280' }}>{supporters.length}人が支援</span>
                </div>
              </div>

              {/* Days Left */}
              <div style={{ textAlign: 'center', background: '#f0f4f8', borderRadius: '8px', padding: '0.8rem', marginBottom: '1.2rem' }}>
                {daysLeft !== null ? (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: daysLeft <= 7 ? '#dc2626' : '#0f2d5a', fontFamily: '"Noto Serif JP", serif' }}>{daysLeft}</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>日残り</div>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>期限未設定</div>
                )}
              </div>

              {/* Support Button */}
              <button
                onClick={() => router.push(`/support/${projectId}`)}
                style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', fontFamily: '"Noto Sans JP", sans-serif', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}>
                🔑 このプロジェクトを支援する
              </button>

              {/* SNS Share */}
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.7rem', textAlign: 'center' }}>シェアして応援</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(projectUrl)}&text=${encodeURIComponent(project.title)}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#1da1f2', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>X</a>
                  <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(projectUrl)}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#06c755', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>LINE</a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(projectUrl)}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#1877f2', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>FB</a>
                  <button onClick={copyUrl}
                    style={{ padding: '0.45rem 0.9rem', background: copied ? '#10b981' : '#e1306c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Noto Sans JP", sans-serif' }}>
                    {copied ? '✓コピー済' : '📷 IG'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: '#0f2d5a', color: '#94a3b8', padding: '2rem 1.5rem', marginTop: '4rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: '#94a3b8' }}>トップページ</Link>
          <Link href="/projects/new" style={{ color: '#94a3b8' }}>プロジェクトを作成</Link>
          <Link href="/support" style={{ color: '#94a3b8' }}>支援方法について</Link>
        </div>
        <p style={{ fontSize: '0.78rem' }}>© 2025 CLOUDFAN – 北海道スポーツ応援クラウドファンディング 🏸⛸</p>
      </footer>
    </>
  );
