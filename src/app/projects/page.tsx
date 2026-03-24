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
  tiers?: any[];
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  'ブロンズ':   { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: '🥉' },
  'シルバー':   { bg: '#f3f4f6', border: '#9ca3af', text: '#374151', icon: '🥈' },
  'ゴールド':   { bg: '#fffbeb', border: '#f59e0b', text: '#78350f', icon: '🥇' },
  'プラチナ':   { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a5f', icon: '💎' },
  'レジェンド': { bg: '#f5f3ff', border: '#7c3aed', text: '#4c1d95', icon: '👑' },
};

function getTierColor(name: string) {
  const key = Object.keys(TIER_COLORS).find(k => name.includes(k));
  return key ? TIER_COLORS[key] : { bg: '#f9fafb', border: '#e5e7eb', text: '#1f2937', icon: '🎁' };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return m ? m[1] : null;
}

function calcDaysLeft(deadline?: string): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params?.id ?? '');

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

        const { data: tierRows } = await supabase
          .from('project_tiers')
          .select('*')
          .eq('project_id', projectId)
          .order('amount', { ascending: true });

        if (tierRows && tierRows.length > 0) {
          setTiers(tierRows);
        } else if (Array.isArray(proj.tiers) && proj.tiers.length > 0) {
          setTiers(
            proj.tiers.map((t: any, i: number) => ({
              id: i + 1,
              name: t.name ?? ('ティア' + (i + 1)),
              amount: t.amount ?? 0,
              description: t.description ?? '',
              max_supporters: t.max_supporters,
              current_supporters: t.current_supporters ?? 0,
              icon: t.icon,
            }))
          );
        }

        const { data: supRows } = await supabase
          .from('supporters')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (supRows) {
          setSupporters(supRows);
          const total = supRows.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
          setTotalRaised(total);
        }
      } catch (e: any) {
        setError(e.message ?? 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏸</div>
          <p style={{ color: '#1e3a5f', fontWeight: 700, fontSize: '1.1rem' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error || 'プロジェクトが見つかりません'}</p>
          <Link href="/" style={{ color: '#2563eb' }}>← トップへ戻る</Link>
        </div>
      </div>
    );
  }

  const validImages = (project.images ?? []).filter((u: string) => u && u.trim() !== '');
  const heroImage = validImages[0] ?? null;
  const storyBlocks = (project.story ?? '').split('---').map((s: string) => s.trim()).filter(Boolean);
  const progressPct = project.goal > 0 ? Math.min(100, Math.round((totalRaised / project.goal) * 100)) : 0;
  const daysLeft = calcDaysLeft(project.deadline);
  const projectUrl = 'https://cloudfan.vercel.app/projects/' + project.id;
  const ytId = project.youtube_url ? getYouTubeId(project.youtube_url) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(projectUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f0f4f8', minHeight: '100vh' }}>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;700&display=swap"
      />

      {/* HEADER */}
      <header style={{
        background: 'linear-gradient(135deg, #0f2d5a 0%, #1e3a5f 60%, #0e4d2f 100%)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img
            src="/logo.png"
            alt="logo"
            style={{ height: '36px', objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <Link href="/" style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none' }}>
            🏸 CLOUDFAN
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/" style={{ color: '#e2e8f0', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', textDecoration: 'none' }}>
            ← トップ
          </Link>
          <Link href={'/projects/' + projectId + '/edit'} style={{ color: '#e2e8f0', fontSize: '0.85rem', padding: '0.4rem 0.9rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', textDecoration: 'none' }}>
            ✏️ 編集
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f2d5a', marginBottom: '0.5rem', lineHeight: 1.4, fontFamily: "'Noto Serif JP', serif" }}>
          {project.title}
        </h1>
        {project.category && (
          <span style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: '0.78rem', padding: '0.2rem 0.7rem', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>
            {project.category}
          </span>
        )}

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* LEFT */}
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>

            {heroImage && (
              <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                <img src={heroImage} alt={project.title} style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }} />
              </div>
            )}

            <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, marginBottom: '1.5rem', background: '#fff', padding: '1.2rem', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {project.description}
            </p>

            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('story')}
                style={{ padding: '0.6rem 1.4rem', border: 'none', borderBottom: activeTab === 'story' ? '3px solid #1d4ed8' : '3px solid transparent', marginBottom: '-2px', background: 'none', fontWeight: activeTab === 'story' ? 700 : 400, color: activeTab === 'story' ? '#1d4ed8' : '#6b7280', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                📖 ストーリー
              </button>
              <button
                onClick={() => setActiveTab('supporters')}
                style={{ padding: '0.6rem 1.4rem', border: 'none', borderBottom: activeTab === 'supporters' ? '3px solid #1d4ed8' : '3px solid transparent', marginBottom: '-2px', background: 'none', fontWeight: activeTab === 'supporters' ? 700 : 400, color: activeTab === 'supporters' ? '#1d4ed8' : '#6b7280', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                {'👥 支援者 (' + supporters.length + ')'}
              </button>
            </div>

            {/* STORY TAB */}
            {activeTab === 'story' && (
              <div>
                {ytId && (
                  <div style={{ marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                    <iframe
                      width="100%"
                      height="360"
                      src={'https://www.youtube.com/embed/' + ytId}
                      frameBorder="0"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  </div>
                )}

                {storyBlocks.length > 0 ? (
                  storyBlocks.map((block, i) => {
                    const img = validImages[i] ?? null;
                    return (
                      <div key={i} style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', alignItems: 'stretch' }}>
                        {img && (
                          <div style={{ flex: '0 0 280px', maxWidth: '280px' }}>
                            <img src={img} alt={'story-' + i} style={{ width: '100%', height: '100%', minHeight: '200px', objectFit: 'cover', display: 'block' }} />
                          </div>
                        )}
                        <div style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center' }}>
                          <p style={{ fontSize: '1rem', lineHeight: 1.9, color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{block}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <p style={{ lineHeight: 1.9, color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>{project.story}</p>
                  </div>
                )}
              </div>
            )}

            {/* SUPPORTERS TAB */}
            {activeTab === 'supporters' && (
              <div>
                {supporters.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    まだ支援者はいません。最初の支援者になりましょう！
                  </div>
                ) : (
                  supporters.map(s => (
                    <div key={s.id} style={{ background: '#fff', borderRadius: '12px', padding: '1.2rem', marginBottom: '1rem', display: 'flex', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a5f, #0e4d2f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                        {s.is_anonymous ? '?' : (s.name ? s.name[0] : '?')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600 }}>{s.is_anonymous ? '匿名' : s.name}</span>
                          <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{'¥' + s.amount.toLocaleString()}</span>
                        </div>
                        {s.message && (
                          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{s.message}</p>
                        )}
                        <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem', marginBottom: 0 }}>
                          {new Date(s.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TIERS */}
            <div style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f2d5a', marginBottom: '1.2rem', paddingBottom: '0.5rem', borderBottom: '2px solid #dbeafe', fontFamily: "'Noto Serif JP', serif" }}>
                🎁 支援ティア・特典
              </h2>
              {tiers.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>ティア情報が設定されていません</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {tiers.map(tier => {
                    const tc = getTierColor(tier.name);
                    const remaining = tier.max_supporters != null
                      ? tier.max_supporters - (tier.current_supporters ?? 0)
                      : null;
                    return (
                      <div key={tier.id} style={{ background: tc.bg, border: '2px solid ' + tc.border, borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>{tier.icon ?? tc.icon}</span>
                          <span style={{ fontWeight: 700, color: tc.text, fontSize: '1rem' }}>{tier.name}</span>
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: tc.text }}>
                          {'¥' + tier.amount.toLocaleString()}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.7, margin: 0 }}>
                          {tier.description}
                        </p>
                        {remaining !== null && (
                          <p style={{ fontSize: '0.8rem', color: remaining <= 5 ? '#dc2626' : '#6b7280', fontWeight: remaining <= 5 ? 700 : 400, margin: 0 }}>
                            {'残り ' + remaining + ' 枠 / ' + tier.max_supporters + ' 枠'}
                          </p>
                        )}
                        <button
                          onClick={() => router.push('/support/' + projectId + '?tier=' + tier.id)}
                          style={{ marginTop: 'auto', padding: '0.6rem 1rem', background: tc.border, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          このティアで支援する
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ flex: '0 0 300px', position: 'sticky', top: '80px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: '2px solid #dbeafe' }}>

              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f2d5a', fontFamily: "'Noto Serif JP', serif" }}>
                  {'¥' + totalRaised.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  {'目標: ¥' + project.goal.toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: progressPct + '%', height: '100%', background: 'linear-gradient(90deg, #1e3a5f, #2563eb)', borderRadius: '999px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{progressPct + '% 達成'}</span>
                  <span style={{ color: '#6b7280' }}>{supporters.length + '人が支援'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', background: '#f0f4f8', borderRadius: '8px', padding: '0.8rem', marginBottom: '1.2rem' }}>
                {daysLeft !== null ? (
                  <div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 700, color: daysLeft <= 7 ? '#dc2626' : '#0f2d5a', fontFamily: "'Noto Serif JP', serif" }}>
                      {daysLeft}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>日残り</div>
                  </div>
                ) : (
                  <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>期限未設定</div>
                )}
              </div>

              <button
                onClick={() => router.push('/support/' + projectId)}
                style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}
              >
                🔑 このプロジェクトを支援する
              </button>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '0.7rem', textAlign: 'center', marginTop: 0 }}>
                  シェアして応援
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={'https://twitter.com/intent/tweet?url=' + encodeURIComponent(projectUrl) + '&text=' + encodeURIComponent(project.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#1da1f2', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                  >
                    X
                  </a>
                  <a
                    href={'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(projectUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#06c755', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                  >
                    LINE
                  </a>
                  <a
                    href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(projectUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '0.45rem 0.9rem', background: '#1877f2', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                  >
                    FB
                  </a>
                  <button
                    onClick={handleCopy}
                    style={{ padding: '0.45rem 0.9rem', background: copied ? '#10b981' : '#e1306c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {copied ? '✓コピー済' : '📷 IG'}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: '#0f2d5a', color: '#94a3b8', padding: '2rem 1.5rem', marginTop: '4rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>トップページ</Link>
          <Link href="/projects/new" style={{ color: '#94a3b8', textDecoration: 'none' }}>プロジェクトを作成</Link>
          <Link href="/support" style={{ color: '#94a3b8', textDecoration: 'none' }}>支援方法について</Link>
        </div>
        <p style={{ fontSize: '0.78rem', margin: 0 }}>
          © 2025 CLOUDFAN – 北海道スポーツ応援クラウドファンディング 🏸⛸
        </p>
      </footer>

    </div>
  );
}
