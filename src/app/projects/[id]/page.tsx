'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Tier {
  id: string;
  name: string;
  amount: number;
  description: string;
  limit: number | null;
  remaining: number | null;
}

interface Supporter {
  id: string;
  name: string | null;
  is_anonymous: boolean;
  amount: number;
  message: string | null;
  created_at: string;
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

const TIER_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  bronze:   { bg: '#fdf6ee', border: '#cd7f32', label: '#cd7f32' },
  silver:   { bg: '#f5f5f5', border: '#aaa',    label: '#666' },
  gold:     { bg: '#fffbea', border: '#f5c400', label: '#b8960c' },
  platinum: { bg: '#f0f8ff', border: '#5b9bd5', label: '#2563eb' },
  legend:   { bg: '#fdf4ff', border: '#a855f7', label: '#7c3aed' },
};

function getTierColor(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(TIER_COLORS)) {
    if (key.includes(k)) return TIER_COLORS[k];
  }
  return { bg: '#f9f9f9', border: '#ccc', label: '#333' };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function calcDaysLeft(deadline: string | null): string {
  if (!deadline) return '期限未設定';
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0) return '終了';
  if (diff === 0) return '本日終了';
  return `残り ${diff} 日`;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject]     = useState<Project | null>(null);
  const [tiers, setTiers]         = useState<Tier[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'supporters'>('story');
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      const { data: proj, error: pErr } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr || !proj) { setError('プロジェクトが見つかりません'); setLoading(false); return; }
      setProject(proj as Project);

      const { data: tierRows } = await supabase
        .from('project_tiers')
        .select('*')
        .eq('project_id', id)
        .order('amount', { ascending: true });
      if (tierRows && tierRows.length > 0) {
        setTiers(tierRows as Tier[]);
      } else if (proj.tiers && Array.isArray(proj.tiers)) {
        setTiers(proj.tiers as Tier[]);
      }

      const { data: supRows } = await supabase
        .from('supporters')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      if (supRows) {
        setSupporters(supRows as Supporter[]);
        setTotalRaised(supRows.reduce((s: number, r: Supporter) => s + (r.amount || 0), 0));
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#666' }}>読み込み中…</p>
    </div>
  );
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#e53e3e' }}>{error}</p>
    </div>
  );
  if (!project) return null;

  const validImages = (project.images || []).filter(
    (u) => typeof u === 'string' && u.startsWith('http')
  );
  const heroImage   = validImages[0] || null;
  const storyImages = validImages.slice(1);

  const storyBlocks = (project.story || '').split('---').map((b) => b.trim()).filter(Boolean);
  const ytId = project.youtube_url ? getYouTubeId(project.youtube_url) : null;
  const daysLeft = calcDaysLeft(project.deadline);
  const progressPct = project.goal > 0 ? Math.min(100, Math.round((totalRaised / project.goal) * 100)) : 0;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&display=swap"
      />
      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f7f8fc', minHeight: '100vh' }}>

        {/* ── ヘッダー ── */}
        <header style={{ background: '#1a2e4a', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="ならバド" style={{ height: 36 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>CloudFan</span>
          </Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link href="/"         style={{ color: '#ccc', textDecoration: 'none', fontSize: 14 }}>ホーム</Link>
            <Link href="/projects" style={{ color: '#ccc', textDecoration: 'none', fontSize: 14 }}>プロジェクト一覧</Link>
          </nav>
        </header>

        {/* ── メインレイアウト ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>

          {/* ── 左カラム ── */}
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>

            {/* タグ */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[project.school, project.club, project.region].filter(Boolean).map((tag) => (
                <span key={tag} style={{ background: '#e8f0fe', color: '#1a56db', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 700 }}>{tag}</span>
              ))}
            </div>

            {/* タイトル */}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a2e4a', marginBottom: 20, fontFamily: "'Noto Serif JP', serif" }}>{project.title}</h1>

            {/* ヒーロー画像 */}
            {heroImage && (
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                <img src={heroImage} alt="メイン画像" style={{ width: '100%', maxHeight: 420, objectFit: 'cover' }} />
              </div>
            )}

            {/* タブ */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
              {(['story', 'supporters'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 28px', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600,
                    background: 'transparent',
                    color: activeTab === tab ? '#1a56db' : '#666',
                    borderBottom: activeTab === tab ? '2px solid #1a56db' : '2px solid transparent',
                    marginBottom: -2,
                  }}
                >
                  {tab === 'story' ? 'ストーリー' : `支援者 (${supporters.length})`}
                </button>
              ))}
            </div>

            {/* ストーリータブ */}
            {activeTab === 'story' && (
              <div>
                <p style={{ color: '#444', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap', marginBottom: 32 }}>{project.description}</p>

                {storyBlocks.map((block, i) => (
                  <div key={i} style={{ marginBottom: 40 }}>
                    {storyImages[i] && (
                      <img src={storyImages[i]} alt={`ストーリー ${i + 1}`}
                        style={{ width: '100%', maxHeight: 340, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
                    )}
                    <p style={{ color: '#333', lineHeight: 1.9, fontSize: 15, whiteSpace: 'pre-wrap' }}>{block}</p>
                  </div>
                ))}

                {ytId && (
                  <div style={{ marginTop: 32, borderRadius: 12, overflow: 'hidden' }}>
                    <iframe
                      width="100%" height="360"
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube" allowFullScreen
                      style={{ border: 'none', display: 'block' }}
                    />
                  </div>
                )}

                {/* ティア一覧 */}
                {tiers.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a2e4a', marginBottom: 20 }}>支援プラン</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {tiers.map((tier) => {
                        const c = getTierColor(tier.name);
                        return (
                          <div key={tier.id} style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 12, padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{ fontWeight: 800, fontSize: 17, color: c.label }}>{tier.name}</span>
                              <span style={{ fontWeight: 800, fontSize: 20, color: '#1a2e4a' }}>¥{tier.amount.toLocaleString()}</span>
                            </div>
                            {tier.description && <p style={{ color: '#555', marginTop: 8, fontSize: 14, lineHeight: 1.7 }}>{tier.description}</p>}
                            {tier.limit != null && (
                              <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
                                残り {tier.remaining ?? tier.limit} / {tier.limit} 枠
                              </p>
                            )}
                            <Link
                              href={`/support/${id}?tier=${tier.id}`}
                              style={{ display: 'inline-block', marginTop: 12, background: c.border, color: '#fff', padding: '8px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}
                            >
                              このプランで支援する
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 支援者タブ */}
            {activeTab === 'supporters' && (
              <div>
                {supporters.length === 0 ? (
                  <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>まだ支援者はいません</p>
                ) : (
                  supporters.map((s) => (
                    <div key={s.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#1a2e4a' }}>{s.is_anonymous ? '匿名' : (s.name || '名前なし')}</span>
                        <span style={{ fontWeight: 700, color: '#1a56db', fontSize: 18 }}>¥{s.amount.toLocaleString()}</span>
                      </div>
                      {s.message && <p style={{ color: '#555', fontSize: 14, marginTop: 6 }}>{s.message}</p>}
                      <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>{new Date(s.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── サイドバー ── */}
          <div style={{ flex: '0 0 300px', minWidth: 260 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', position: 'sticky', top: 24 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1a56db', marginBottom: 4 }}>¥{totalRaised.toLocaleString()}</div>
              <div style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>目標 ¥{project.goal.toLocaleString()}</div>

              <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, marginBottom: 8 }}>
                <div style={{ background: '#1a56db', borderRadius: 8, height: 10, width: `${progressPct}%`, transition: 'width .6s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 20 }}>
                <span>{progressPct}% 達成</span>
                <span>{supporters.length} 支援者</span>
              </div>

              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '8px 16px', textAlign: 'center', color: '#1a56db', fontWeight: 700, marginBottom: 20 }}>
                {daysLeft}
              </div>

              <Link
                href={`/support/${id}`}
                style={{ display: 'block', background: '#1a56db', color: '#fff', borderRadius: 10, padding: '14px 0', textAlign: 'center', fontWeight: 800, fontSize: 16, textDecoration: 'none', marginBottom: 16 }}
              >
                🤝 このプロジェクトを支援する
              </Link>

              {/* SNS シェア */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(project.title)}`} target="_blank" rel="noreferrer"
                  style={{ display: 'block', background: '#000', color: '#fff', borderRadius: 8, padding: '8px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  𝕏 でシェア
                </a>
                <a href={`https://line.me/R/msg/text/?${encodeURIComponent(project.title + ' ' + pageUrl)}`} target="_blank" rel="noreferrer"
                  style={{ display: 'block', background: '#06C755', color: '#fff', borderRadius: 8, padding: '8px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  LINE でシェア
                </a>
                <button onClick={copyUrl}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  {copied ? '✅ コピーしました' : '🔗 URL をコピー'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer style={{ background: '#1a2e4a', color: '#aaa', textAlign: 'center', padding: '24px 16px', fontSize: 13, marginTop: 48 }}>
          <p>© 2025 CloudFan – 北海道スポーツ応援プラットフォーム</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            <Link href="/"         style={{ color: '#aaa', textDecoration: 'none' }}>ホーム</Link>
            <Link href="/projects" style={{ color: '#aaa', textDecoration: 'none' }}>プロジェクト一覧</Link>
            <Link href="/admin"    style={{ color: '#aaa', textDecoration: 'none' }}>管理</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
