'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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

// ① ボタン色をティアごとに鮮やかに（btnプロパティ追加）
const TIER_STYLES: Record<string, { bg: string; border: string; label: string; btn: string }> = {
  bronze:   { bg: '#fdf6ee', border: '#cd7f32', label: '#7c4d00', btn: '#cd7f32' },
  silver:   { bg: '#f5f5f5', border: '#7a9ab5', label: '#37546d', btn: '#4a7fa5' },
  gold:     { bg: '#fffbea', border: '#d4a017', label: '#8a6200', btn: '#d4a017' },
  platinum: { bg: '#f0f8ff', border: '#5b9bd5', label: '#1e4d8c', btn: '#2563eb' },
  legend:   { bg: '#fdf4ff', border: '#a855f7', label: '#6b21a8', btn: '#9333ea' },
};

function getTierStyle(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(TIER_STYLES)) {
    if (key.includes(k)) return TIER_STYLES[k];
  }
  return { bg: '#f0f4ff', border: '#1a56db', label: '#1a2e4a', btn: '#1a56db' };
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ② NaN日を修正（空文字・無効日付チェック追加）
function calcDaysLeft(deadline: string | null): string {
  if (!deadline || deadline.trim() === '') return '期限未設定';
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return '期限未設定';
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return '終了';
  if (diff === 0) return '本日終了';
  return `残り ${diff} 日`;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject]           = useState<Project | null>(null);
  const [tiers, setTiers]               = useState<Tier[]>([]);
  const [supporters, setSupporters]     = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeTab, setActiveTab]       = useState<'story' | 'supporters'>('story');
  const [copied, setCopied]             = useState(false);

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

      // ③ Number()で型強制変換してamountが文字列でも正しく集計
      const { data: supRows } = await supabase
        .from('supporters')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (supRows) {
        setSupporters(supRows as Supporter[]);
        const total = supRows.reduce(
          (sum: number, r: Supporter) => sum + (Number(r.amount) || 0),
          0
        );
        setTotalRaised(total);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44,
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #1a56db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 14px',
        }} />
        <p style={{ color: '#666', fontSize: 15 }}>読み込み中…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#e53e3e', fontSize: 16 }}>{error}</p>
    </div>
  );

  if (!project) return null;

  const validImages = (project.images || []).filter(
    (u) => typeof u === 'string' && u.startsWith('http')
  );
  const heroImage   = validImages[0] || null;
  const storyImages = validImages.slice(1);
  const storyBlocks = (project.story || '').split('---').map((b) => b.trim()).filter(Boolean);
  const ytId        = project.youtube_url ? getYouTubeId(project.youtube_url) : null;
  const daysLeft    = calcDaysLeft(project.deadline);
  const progressPct = project.goal > 0
    ? Math.min(100, Math.round((totalRaised / project.goal) * 100)) : 0;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Serif+JP:wght@700&display=swap" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f7f8fc', minHeight: '100vh' }}>

        {/* ヘッダー */}
        <header style={{
          background: '#1a2e4a', padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="ならバド" style={{ height: 36 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>CloudFan</span>
          </Link>
          <nav style={{ display: 'flex', gap: 8 }}>
            <Link href="/"         style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, padding: '6px 12px' }}>ホーム</Link>
            <Link href="/projects" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 14, padding: '6px 12px' }}>プロジェクト一覧</Link>
          </nav>
        </header>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* 左カラム */}
          <div style={{ flex: '1 1 600px', minWidth: 0 }}>

            {/* タグ */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[project.school, project.club, project.region].filter(Boolean).map((tag) => (
                <span key={tag} style={{
                  background: '#e8f0fe', color: '#1a56db',
                  borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700,
                }}>{tag}</span>
              ))}
            </div>

            {/* タイトル */}
            <h1 style={{
              fontSize: 26, fontWeight: 900, color: '#1a2e4a',
              marginBottom: 24, lineHeight: 1.4,
              fontFamily: "'Noto Serif JP', serif",
            }}>{project.title}</h1>

            {/* ④ ヒーロー画像（16:9固定） */}
            {heroImage && (
              <div style={{
                borderRadius: 14, overflow: 'hidden', marginBottom: 28,
                boxShadow: '0 6px 24px rgba(0,0,0,0.14)',
                aspectRatio: '16/9', background: '#e2e8f0',
              }}>
                <img src={heroImage} alt="メイン画像"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
              </div>
            )}

            {/* ⑤ タブ（ピル型・背景塗り） */}
            <div style={{
              display: 'flex', gap: 4, marginBottom: 28,
              background: '#e2e8f0', borderRadius: 12, padding: 4,
            }}>
              {(['story', 'supporters'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none',
                    cursor: 'pointer', borderRadius: 9,
                    fontSize: 14, fontWeight: 700,
                    background: activeTab === tab ? '#fff' : 'transparent',
                    color: activeTab === tab ? '#1a56db' : '#666',
                    boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.2s',
                    fontFamily: "'Noto Sans JP', sans-serif",
                  }}
                >
                  {tab === 'story' ? '📖 ストーリー' : `👥 支援者 (${supporters.length})`}
                </button>
              ))}
            </div>

            {/* ストーリータブ */}
            {activeTab === 'story' && (
              <div>
                <p style={{ color: '#444', lineHeight: 2, fontSize: 15, whiteSpace: 'pre-wrap', marginBottom: 36 }}>
                  {project.description}
                </p>

                {storyBlocks.map((block, i) => (
                  <div key={i} style={{ marginBottom: 48 }}>
                    {storyImages[i] && (
                      <div style={{
                        borderRadius: 12, overflow: 'hidden', marginBottom: 16,
                        aspectRatio: '16/9', background: '#e2e8f0',
                      }}>
                        <img src={storyImages[i]} alt={`ストーリー ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                      </div>
                    )}
                    <p style={{ color: '#333', lineHeight: 2, fontSize: 15, whiteSpace: 'pre-wrap' }}>{block}</p>
                  </div>
                ))}

                {ytId && (
                  <div style={{ borderRadius: 14, overflow: 'hidden', marginTop: 32, aspectRatio: '16/9' }}>
                    <iframe width="100%" height="100%"
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube" allowFullScreen
                      style={{ border: 'none', display: 'block' }} />
                  </div>
                )}

                {/* ① ティアボタン（鮮やかな色） */}
                {tiers.length > 0 && (
                  <div style={{ marginTop: 48 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a2e4a', marginBottom: 20 }}>
                      🎁 支援プランを選ぶ
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {tiers.map((tier) => {
                        const s = getTierStyle(tier.name);
                        return (
                          <div key={tier.id} style={{
                            background: s.bg, border: `2px solid ${s.border}`,
                            borderRadius: 14, padding: '22px 26px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                              <span style={{ fontWeight: 900, fontSize: 18, color: s.label }}>🏆 {tier.name}</span>
                              <span style={{ fontWeight: 900, fontSize: 24, color: '#1a2e4a' }}>¥{Number(tier.amount).toLocaleString()}</span>
                            </div>
                            {tier.description && (
                              <p style={{ color: '#555', fontSize: 14, lineHeight: 1.8, marginBottom: 14 }}>{tier.description}</p>
                            )}
                            {tier.limit != null && (
                              <p style={{ fontSize: 13, color: '#777', marginBottom: 14 }}>
                                残り <strong>{tier.remaining ?? tier.limit}</strong> / {tier.limit} 枠
                              </p>
                            )}
                            <Link
                              href={`/support/${id}?tier=${tier.id}`}
                              style={{
                                display: 'inline-block',
                                background: s.btn,
                                color: '#fff',
                                padding: '10px 28px',
                                borderRadius: 10,
                                textDecoration: 'none',
                                fontSize: 14,
                                fontWeight: 700,
                                boxShadow: `0 3px 10px ${s.btn}55`,
                              }}
                            >
                              このプランで支援する →
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
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa' }}>
                    <p style={{ fontSize: 40, marginBottom: 12 }}>🤝</p>
                    <p style={{ fontSize: 16 }}>まだ支援者はいません。最初の支援者になりましょう！</p>
                  </div>
                ) : (
                  supporters.map((s) => (
                    <div key={s.id} style={{
                      background: '#fff', borderRadius: 12,
                      padding: '18px 22px', marginBottom: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: 12,
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: '#1a2e4a', fontSize: 15 }}>
                          {s.is_anonymous ? '🙈 匿名' : `👤 ${s.name || '名前なし'}`}
                        </span>
                        {s.message && (
                          <p style={{ color: '#555', fontSize: 14, marginTop: 6, lineHeight: 1.7 }}>
                            💬 {s.message}
                          </p>
                        )}
                        <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                          {new Date(s.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <span style={{ fontWeight: 900, color: '#1a56db', fontSize: 20, whiteSpace: 'nowrap' }}>
                        ¥{Number(s.amount).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div style={{ flex: '0 0 300px', minWidth: 260 }}>
            <div style={{
              background: '#fff', borderRadius: 18, padding: 24,
              boxShadow: '0 6px 28px rgba(0,0,0,0.10)',
              position: 'sticky', top: 80,
            }}>
              <div style={{ fontSize: 34, fontWeight: 900, color: '#1a56db', marginBottom: 2 }}>
                ¥{totalRaised.toLocaleString()}
              </div>
              <div style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                目標 ¥{Number(project.goal).toLocaleString()}
              </div>

              <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #1a56db, #3b82f6)',
                  borderRadius: 99, height: 10,
                  width: `${progressPct}%`,
                  transition: 'width .8s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 20, fontWeight: 600 }}>
                <span>🎯 {progressPct}% 達成</span>
                <span>👥 {supporters.length} 支援者</span>
              </div>

              {/* ② 残り日数（NaN修正済み） */}
              <div style={{
                background: daysLeft === '終了' ? '#fff0f0' : '#f0f4ff',
                borderRadius: 10, padding: '10px 16px',
                textAlign: 'center',
                color: daysLeft === '終了' ? '#e53e3e' : '#1a56db',
                fontWeight: 700, fontSize: 15, marginBottom: 20,
              }}>
                ⏰ {daysLeft}
              </div>

              <Link
                href={`/support/${id}`}
                style={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                  color: '#fff', borderRadius: 12,
                  padding: '15px 0', textAlign: 'center',
                  fontWeight: 900, fontSize: 16,
                  textDecoration: 'none', marginBottom: 20,
                  boxShadow: '0 4px 16px rgba(26,86,219,0.4)',
                }}
              >
                🤝 このプロジェクトを支援する
              </Link>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginBottom: 10 }}>シェアして応援しよう</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(project.title)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: '#000', color: '#fff', borderRadius: 8, padding: '9px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                    𝕏 でシェア
                  </a>
                  <a href={`https://line.me/R/msg/text/?${encodeURIComponent(project.title + ' ' + pageUrl)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: '#06C755', color: '#fff', borderRadius: 8, padding: '9px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                    LINE でシェア
                  </a>
                  <button onClick={copyUrl}
                    style={{
                      background: copied ? '#e8f5e9' : '#f1f5f9',
                      border: `1px solid ${copied ? '#4caf50' : '#cbd5e1'}`,
                      borderRadius: 8, padding: '9px 0', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700,
                      color: copied ? '#2e7d32' : '#334155',
                    }}>
                    {copied ? '✅ コピーしました！' : '🔗 URL をコピー'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer style={{ background: '#1a2e4a', color: '#8a9ab5', textAlign: 'center', padding: '28px 16px', fontSize: 13, marginTop: 60 }}>
          <p style={{ marginBottom: 12 }}>© 2025 CloudFan – 北海道スポーツ応援プラットフォーム</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            <Link href="/"         style={{ color: '#8a9ab5', textDecoration: 'none' }}>ホーム</Link>
            <Link href="/projects" style={{ color: '#8a9ab5', textDecoration: 'none' }}>プロジェクト一覧</Link>
            <Link href="/admin"    style={{ color: '#8a9ab5', textDecoration: 'none' }}>管理</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
