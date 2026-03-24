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

const TIER_STYLES: Record<string, { accent: string; btn: string; light: string }> = {
  bronze:   { accent: '#cd7f32', btn: '#cd7f32', light: '#fdf6ee' },
  silver:   { accent: '#4a7fa5', btn: '#4a7fa5', light: '#f0f7ff' },
  gold:     { accent: '#d4a017', btn: '#d4a017', light: '#fffbea' },
  platinum: { accent: '#2563eb', btn: '#2563eb', light: '#eff6ff' },
  legend:   { accent: '#9333ea', btn: '#9333ea', light: '#faf5ff' },
};
function getTierStyle(name: string) {
  const key = name.toLowerCase();
  for (const k of Object.keys(TIER_STYLES)) {
    if (key.includes(k)) return TIER_STYLES[k];
  }
  return { accent: '#1a56db', btn: '#1a56db', light: '#eff6ff' };
}
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
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
  const [project, setProject]         = useState<Project | null>(null);
  const [tiers, setTiers]             = useState<Tier[]>([]);
  const [supporters, setSupporters]   = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<'story' | 'tiers' | 'supporters'>('story');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: proj, error: pErr } = await supabase
        .from('crowdfunding_projects').select('*').eq('id', id).single();
      if (pErr || !proj) { setError('プロジェクトが見つかりません'); setLoading(false); return; }
      setProject(proj as Project);

      const { data: tierRows } = await supabase
        .from('project_tiers').select('*').eq('project_id', id).order('amount', { ascending: true });
      if (tierRows && tierRows.length > 0) {
        setTiers(tierRows as Tier[]);
      } else if (proj.tiers && Array.isArray(proj.tiers)) {
        setTiers(proj.tiers as Tier[]);
      }

      const { data: supRows } = await supabase
        .from('supporters').select('*').eq('project_id', id).order('created_at', { ascending: false });
      if (supRows) {
        setSupporters(supRows as Supporter[]);
        setTotalRaised(supRows.reduce((s: number, r: Supporter) => s + (Number(r.amount) || 0), 0));
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #e2e8f0', borderTop: '4px solid #1a56db', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: '#666' }}>読み込み中…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#e53e3e' }}>{error}</p>
    </div>
  );
  if (!project) return null;

  const validImages = (project.images || []).filter(u => typeof u === 'string' && u.startsWith('http'));
  const heroImage   = validImages[0] || null;
  const storyImages = validImages.slice(1);
  const storyBlocks = (project.story || '').split('---').map(b => b.trim()).filter(Boolean);
  const ytId        = project.youtube_url ? getYouTubeId(project.youtube_url) : null;
  const daysLeft    = calcDaysLeft(project.deadline);
  const progressPct = project.goal > 0 ? Math.min(100, Math.round((totalRaised / project.goal) * 100)) : 0;
  const pageUrl     = typeof window !== 'undefined' ? window.location.href : '';

  const TABS = [
    { key: 'story',     label: 'ストーリー' },
    { key: 'tiers',     label: `支援プラン (${tiers.length})` },
    { key: 'supporters',label: `支援者 (${supporters.length})` },
  ] as const;

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Serif+JP:wght@700&display=swap" />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .tier-card:hover{box-shadow:0 8px 32px rgba(0,0,0,0.13)!important;transform:translateY(-2px)}
        .support-btn:hover{opacity:0.9;transform:translateY(-1px)}
        body{margin:0}
      `}</style>

      <div style={{ fontFamily: "'Noto Sans JP',sans-serif", background: '#fff', minHeight: '100vh', color: '#1a1a1a' }}>

        {/* ── ヘッダー ── */}
        <header style={{ background: '#1a2e4a', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="logo" style={{ height: 32 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>CloudFan</span>
          </Link>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/"         style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>ホーム</Link>
            <Link href="/projects" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 13 }}>一覧</Link>
          </div>
        </header>

        {/* ── ヒーロー画像（フル幅） ── */}
        {heroImage && (
          <div style={{ background: '#111', maxHeight: 480, overflow: 'hidden' }}>
            <img src={heroImage} alt="hero" style={{ width: '100%', maxHeight: 480, objectFit: 'cover', objectPosition: 'center', display: 'block', opacity: 0.95 }} />
          </div>
        )}

        {/* ── メインレイアウト ── */}
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 16px 80px', display: 'flex', gap: 0, alignItems: 'flex-start' }}>

          {/* ───── 左カラム ───── */}
          <div style={{ flex: '1 1 0', minWidth: 0, paddingRight: 40, paddingTop: 32 }}>

            {/* タグ */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {[project.school, project.club, project.region].filter(Boolean).map(tag => (
                <span key={tag} style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{tag}</span>
              ))}
            </div>

            {/* タイトル */}
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1.45, marginBottom: 20, fontFamily: "'Noto Serif JP',serif" }}>
              {project.title}
            </h1>

            {/* SNS シェアバー */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(project.title)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', borderRadius: 6, padding: '7px 16px', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                𝕏 ポスト
              </a>
              <a href={`https://line.me/R/msg/text/?${encodeURIComponent(project.title + ' ' + pageUrl)}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#06C755', color: '#fff', borderRadius: 6, padding: '7px 16px', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                LINE
              </a>
              <button onClick={() => { navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: copied ? '#dcfce7' : '#f3f4f6', border: `1px solid ${copied ? '#86efac' : '#d1d5db'}`, color: copied ? '#166534' : '#374151', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {copied ? '✅ コピー済み' : '🔗 URLコピー'}
              </button>
            </div>

            {/* ── タブ ── */}
            <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: 32, display: 'flex', gap: 0 }}>
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 22px', border: 'none', cursor: 'pointer',
                    background: 'transparent', fontSize: 14, fontWeight: 700,
                    color: activeTab === tab.key ? '#1a56db' : '#6b7280',
                    borderBottom: activeTab === tab.key ? '2px solid #1a56db' : '2px solid transparent',
                    marginBottom: -2, transition: 'all 0.15s',
                    fontFamily: "'Noto Sans JP',sans-serif",
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ────── ストーリータブ ────── */}
            {activeTab === 'story' && (
              <div>
                {/* イントロ */}
                <div style={{ fontSize: 16, lineHeight: 2.1, color: '#333', whiteSpace: 'pre-wrap', marginBottom: 40 }}>
                  {project.description}
                </div>

                {/* ストーリーブロック（CAMPFIREのようなセクション形式） */}
                {storyBlocks.map((block, i) => (
                  <div key={i} style={{ marginBottom: 56 }}>
                    {/* セクションヘッダー */}
                    <div style={{ background: 'linear-gradient(90deg, #1a2e4a, #2d4a6e)', borderRadius: 6, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ background: '#d4af37', color: '#1a2e4a', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 900 }}>0{i + 1}</span>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: "'Noto Serif JP',serif" }}>
                        {i === 0 ? 'はじめに・ご挨拶' : i === 1 ? '活動のご紹介' : `セクション ${i + 1}`}
                      </span>
                    </div>

                    {/* セクション画像 */}
                    {storyImages[i] && (
                      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 24, aspectRatio: '16/9', background: '#f3f4f6' }}>
                        <img src={storyImages[i]} alt={`section-${i}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}

                    {/* セクション本文 */}
                    <div style={{ fontSize: 16, lineHeight: 2.1, color: '#333', whiteSpace: 'pre-wrap' }}>
                      {block}
                    </div>

                    {/* セクション区切り */}
                    {i < storyBlocks.length - 1 && (
                      <div style={{ borderTop: '1px dashed #e5e7eb', marginTop: 48 }} />
                    )}
                  </div>
                ))}

                {/* YouTube */}
                {ytId && (
                  <div style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16, aspectRatio: '16/9', marginBottom: 40 }}>
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube" allowFullScreen style={{ border: 'none', display: 'block' }} />
                  </div>
                )}
              </div>
            )}

            {/* ────── 支援プランタブ ────── */}
            {activeTab === 'tiers' && (
              <div>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                  以下のプランからお選びください。支援はプロジェクトの実現を後押しします。
                </p>
                {tiers.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>支援プランはまだありません</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {tiers.map(tier => {
                      const s = getTierStyle(tier.name);
                      return (
                        <div key={tier.id} className="tier-card" style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                          {/* カードヘッダー */}
                          <div style={{ background: s.light, borderBottom: `3px solid ${s.accent}`, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 800, color: s.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{tier.name}</span>
                              <div style={{ fontSize: 32, fontWeight: 900, color: s.accent, lineHeight: 1.2, marginTop: 4 }}>
                                ¥{Number(tier.amount).toLocaleString()}
                              </div>
                            </div>
                            {tier.limit != null && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: '#6b7280' }}>残り枠</div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: Number(tier.remaining ?? tier.limit) <= 5 ? '#dc2626' : '#1a2e4a' }}>
                                  {tier.remaining ?? tier.limit} / {tier.limit}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* カード本文 */}
                          <div style={{ padding: '20px 24px' }}>
                            {tier.description && (
                              <p style={{ fontSize: 15, lineHeight: 1.9, color: '#374151', marginBottom: 20 }}>
                                {tier.description}
                              </p>
                            )}
                            <Link href={`/support/${id}?tier=${tier.id}`}
                              style={{ display: 'inline-block', background: s.btn, color: '#fff', padding: '12px 32px', borderRadius: 8, textDecoration: 'none', fontSize: 15, fontWeight: 700, boxShadow: `0 4px 12px ${s.btn}44` }}>
                              このプランで支援する →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ────── 支援者タブ ────── */}
            {activeTab === 'supporters' && (
              <div>
                {supporters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                    <p style={{ fontSize: 16 }}>まだ支援者はいません。最初の支援者になりましょう！</p>
                  </div>
                ) : supporters.map(s => (
                  <div key={s.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 22px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 15, marginBottom: 4 }}>
                        {s.is_anonymous ? '🙈 匿名の支援者' : `👤 ${s.name || '名前なし'}`}
                      </div>
                      {s.message && <p style={{ color: '#555', fontSize: 14, lineHeight: 1.8, margin: '6px 0' }}>💬 {s.message}</p>}
                      <p style={{ color: '#9ca3af', fontSize: 12 }}>{new Date(s.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: '#1a56db', whiteSpace: 'nowrap' }}>
                      ¥{Number(s.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ───── サイドバー ───── */}
          <div style={{ flex: '0 0 310px', paddingTop: 32 }}>
            <div style={{ position: 'sticky', top: 72, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>

              {/* 募集金額 */}
              <div style={{ padding: '24px 24px 0' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#1a56db', lineHeight: 1 }}>
                  ¥{totalRaised.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, marginBottom: 14 }}>
                  目標 ¥{Number(project.goal).toLocaleString()} 達成
                </div>

                {/* プログレスバー */}
                <div style={{ background: '#f3f4f6', borderRadius: 99, height: 8, marginBottom: 10, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg,#1a56db,#3b82f6)', height: 8, width: `${progressPct}%`, borderRadius: 99, transition: 'width 1s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                  <span style={{ fontWeight: 700, color: '#1a56db' }}>{progressPct}% 達成</span>
                  <span>👥 {supporters.length}人が支援</span>
                </div>

                {/* 残り日数 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faff', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>⏰ 残り日数</span>
                  <span style={{ fontWeight: 900, fontSize: 16, color: daysLeft === '終了' ? '#dc2626' : '#1a2e4a' }}>{daysLeft}</span>
                </div>

                {/* 支援ボタン */}
                <Link href={`/support/${id}`} className="support-btn"
                  style={{ display: 'block', background: 'linear-gradient(135deg,#1a56db,#2563eb)', color: '#fff', borderRadius: 10, padding: '16px 0', textAlign: 'center', fontWeight: 900, fontSize: 17, textDecoration: 'none', marginBottom: 12, boxShadow: '0 4px 16px rgba(26,86,219,0.35)', transition: 'all 0.2s' }}>
                  🤝 このプロジェクトを支援する
                </Link>

                {/* 支援プランへ */}
                <button onClick={() => setActiveTab('tiers')}
                  style={{ width: '100%', background: '#f8faff', border: '1px solid #c7d7f5', borderRadius: 10, padding: '12px 0', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#1a56db', marginBottom: 20 }}>
                  支援プランを見る ({tiers.length}プラン)
                </button>
              </div>

              {/* 区切り */}
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 24px 20px' }}>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, textAlign: 'center' }}>シェアして応援する</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(project.title)}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex: 1, display: 'block', background: '#000', color: '#fff', borderRadius: 7, padding: '9px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>𝕏</a>
                  <a href={`https://line.me/R/msg/text/?${encodeURIComponent(project.title + ' ' + pageUrl)}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex: 1, display: 'block', background: '#06C755', color: '#fff', borderRadius: 7, padding: '9px 0', textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>LINE</a>
                  <button onClick={() => { navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                    style={{ flex: 1, background: copied ? '#dcfce7' : '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, padding: '9px 0', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copied ? '#166534' : '#374151' }}>
                    {copied ? '✅' : '🔗コピー'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer style={{ background: '#1a2e4a', color: '#8a9ab5', textAlign: 'center', padding: '28px 16px', fontSize: 13 }}>
          <p style={{ marginBottom: 10 }}>© 2025 CloudFan – 北海道スポーツ応援プラットフォーム</p>
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
