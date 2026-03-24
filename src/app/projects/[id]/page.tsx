'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Project {
  id: number; title: string; description: string; story: string;
  school: string; club: string; goal: number; status: string;
  youtube_url: string | null; images: string[] | null;
  region: string; deadline: string;
}
interface Tier {
  id: number; project_id: number; name: string; amount: number;
  description: string; max_supporters: number | null; current_supporters: number;
}
interface Supporter {
  id: number; name: string; total_amount: number;
  created_at: string; message?: string;
}

const TIER_COLORS: Record<string, string> = {
  ブロンズ: '#cd7f32', シルバー: '#9e9e9e', ゴールド: '#f5c518',
  プラチナ: '#1a9fd6', レジェンド: '#e040fb',
};
const TIER_ICONS: Record<string, string> = {
  ブロンズ: '🥉', シルバー: '🥈', ゴールド: '🥇', プラチナ: '💎', レジェンド: '👑',
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'story' | 'supporters'>('story');

  useEffect(() => {
    const id = params.id as string;
    Promise.all([fetchProject(id), fetchTiers(id), fetchSupporters(id)])
      .finally(() => setLoading(false));
  }, [params.id]);

  async function fetchProject(id: string) {
    const { data, error } = await supabase
      .from('crowdfunding_projects').select('*').eq('id', id).single();
    if (error) setError('プロジェクトが見つかりませんでした');
    else setProject(data);
  }
  async function fetchTiers(id: string) {
    try {
      const { data } = await supabase.from('project_tiers').select('*')
        .eq('project_id', id).order('amount', { ascending: true });
      if (data) setTiers(data);
    } catch { setTiers([]); }
  }
  async function fetchSupporters(id: string) {
    try {
      const { data } = await supabase.from('supporters').select('*')
        .eq('project_id', id).order('created_at', { ascending: false });
      if (data) {
        setSupporters(data as Supporter[]);
        setTotalRaised((data as Supporter[]).reduce((s, r) => s + (r.total_amount ?? 0), 0));
      }
    } catch { setSupporters([]); }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f5f5f5' }}>
      <p style={{ color:'#555' }}>読み込み中...</p>
    </div>
  );
  if (error || !project) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f5f5f5' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#e55', marginBottom:'1rem' }}>{error || 'プロジェクトが見つかりません'}</p>
        <Link href="/" style={{ color:'#3a7bd5' }}>トップに戻る</Link>
      </div>
    </div>
  );

  const goalAmt    = project.goal ?? 1;
  const progress   = Math.min(100, Math.round((totalRaised / goalAmt) * 100));
  const daysLeft   = Math.max(0, Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000));
  const validImages = (project.images ?? []).filter(url => url && url.trim() !== '');
  const storyBlocks = (project.story ?? '').split('---').map(s => s.trim()).filter(s => s !== '');
  const projectUrl  = `https://cloudfan.vercel.app/projects/${project.id}`;

  return (
    <div style={{ background:'#f5f5f5', minHeight:'100vh', fontFamily:"'Noto Sans JP', sans-serif" }}>

      {/* ヘッダー */}
      <header style={{ background:'#fff', borderBottom:'1px solid #e0e0e0', padding:'0 2rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <Link href="/" style={{ color:'#333', textDecoration:'none', fontWeight:700, fontSize:'1.2rem' }}>⚽ CloudFan</Link>
        <nav style={{ display:'flex', gap:'1.5rem' }}>
          <Link href="/"         style={{ color:'#555', textDecoration:'none', fontSize:'0.9rem' }}>ホーム</Link>
          <Link href="/projects" style={{ color:'#555', textDecoration:'none', fontSize:'0.9rem' }}>プロジェクト一覧</Link>
        </nav>
      </header>

      <main style={{ maxWidth:'1080px', margin:'0 auto', padding:'2rem 1.5rem' }}>

        {/* タイトル・タグ */}
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.75rem' }}>
            <span style={{ background:'#e8f4fd', color:'#2a7bd5', padding:'3px 12px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:600 }}>{project.school}</span>
            <span style={{ background:'#e8f4fd', color:'#2a7bd5', padding:'3px 12px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:600 }}>{project.club}</span>
            <span style={{ background:'#fff3e0', color:'#e65100', padding:'3px 12px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:600 }}>📍 {project.region}</span>
          </div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:700, color:'#222', margin:0, lineHeight:1.4 }}>{project.title}</h1>
        </div>

        {/* 2カラム */}
        <div style={{ display:'flex', gap:'2rem', alignItems:'flex-start', flexWrap:'wrap' }}>

          {/* ── 左カラム ── */}
          <div style={{ flex:'1 1 580px', minWidth:0 }}>

            {/* メインビジュアル（1枚目） */}
            {validImages.length > 0 ? (
              <div style={{ borderRadius:'12px', overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', marginBottom:'1.5rem', aspectRatio:'16/9' }}>
                <img src={validImages[0]} alt={project.title}
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              </div>
            ) : (
              <div style={{ background:'#ddd', borderRadius:'12px', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.5rem' }}>
                <span style={{ color:'#999' }}>画像なし</span>
              </div>
            )}

            {/* 概要 */}
            <div style={{ background:'#fff', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>
              <p style={{ color:'#444', lineHeight:1.8, margin:0, fontSize:'0.97rem' }}>{project.description}</p>
            </div>

            {/* タブ */}
            <div style={{ marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', borderBottom:'2px solid #e0e0e0', marginBottom:'1.5rem' }}>
                {(['story','supporters'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ padding:'0.65rem 1.5rem', border:'none', background:'none', cursor:'pointer',
                      fontWeight: activeTab===tab ? 700 : 400,
                      color:      activeTab===tab ? '#2a7bd5' : '#888',
                      borderBottom: activeTab===tab ? '2px solid #2a7bd5' : '2px solid transparent',
                      marginBottom:'-2px', fontSize:'0.95rem' }}>
                    {tab==='story' ? '📖 ストーリー' : `👥 支援者 (${supporters.length})`}
                  </button>
                ))}
              </div>

              {/* ── ストーリータブ ── */}
              {activeTab === 'story' && (
                <div>
                  {/* YouTube */}
                  {project.youtube_url && (
                    <div style={{ marginBottom:'2rem' }}>
                      <div style={{ position:'relative', paddingBottom:'56.25%', height:0, borderRadius:'10px', overflow:'hidden' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${
                            project.youtube_url.includes('youtu.be/')
                              ? project.youtube_url.split('youtu.be/')[1]
                              : project.youtube_url.split('v=')[1]?.split('&')[0]
                          }`}
                          style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                          allowFullScreen />
                      </div>
                    </div>
                  )}

                  {/* 写真左・文章右 統一ブロック */}
                  {storyBlocks.length > 0 ? (
                    storyBlocks.map((block, i) => (
                      <div key={i} style={{
                        display:'flex', flexDirection:'row', gap:'1.5rem',
                        marginBottom:'2rem', alignItems:'center',
                        background:'#fff', borderRadius:'16px', padding:'1.5rem',
                        boxShadow:'0 2px 8px rgba(0,0,0,0.07)'
                      }}>
                        {/* 写真：常に左 */}
                        {validImages[i] && (
                          <div style={{ flex:'0 0 42%', minWidth:'180px' }}>
                            <img src={validImages[i]} alt={`ストーリー${i+1}`}
                              style={{ width:'100%', borderRadius:'10px', objectFit:'cover', aspectRatio:'4/3', display:'block' }} />
                          </div>
                        )}
                        {/* テキスト：常に右 */}
                        <div style={{ flex:'1 1 50%' }}>
                          <p style={{ color:'#333', lineHeight:1.9, whiteSpace:'pre-wrap', margin:0, fontSize:'0.97rem' }}>{block}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    project.story && (
                      <div style={{ background:'#fff', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>
                        <p style={{ color:'#444', lineHeight:1.9, whiteSpace:'pre-wrap', margin:0 }}>{project.story}</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 支援者タブ */}
              {activeTab === 'supporters' && (
                <div style={{ background:'#fff', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 6px rgba(0,0,0,0.06)' }}>
                  {supporters.length === 0 ? (
                    <p style={{ color:'#888', textAlign:'center', padding:'2rem 0' }}>まだ支援者がいません</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                      {supporters.map(s => (
                        <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'0.75rem', borderRadius:'8px', background:'#f8f9fa' }}>
                          <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'#2a7bd5', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>
                            {(s.name||'匿')[0]}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontWeight:600, color:'#333', fontSize:'0.95rem' }}>{s.name||'匿名'}</p>
                            {s.message && <p style={{ margin:'2px 0 0', color:'#666', fontSize:'0.85rem' }}>{s.message}</p>}
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <p style={{ margin:0, fontWeight:700, color:'#2a7bd5' }}>¥{s.total_amount?.toLocaleString()}</p>
                            <p style={{ margin:0, color:'#aaa', fontSize:'0.78rem' }}>{new Date(s.created_at).toLocaleDateString('ja-JP')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 支援ティア */}
            {tiers.length > 0 && (
              <div style={{ marginBottom:'2rem' }}>
                <h2 style={{ fontSize:'1.1rem', fontWeight:700, color:'#222', marginBottom:'1rem' }}>🎁 支援コース</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                  {tiers.map(tier => {
                    const color = Object.entries(TIER_COLORS).find(([k]) => tier.name.includes(k))?.[1] ?? '#2a7bd5';
                    const icon  = Object.entries(TIER_ICONS ).find(([k]) => tier.name.includes(k))?.[1] ?? '⭐';
                    const rem   = tier.max_supporters != null ? Math.max(0, tier.max_supporters - tier.current_supporters) : null;
                    return (
                      <div key={tier.id} style={{ background:'#fff', borderRadius:'12px', padding:'1.25rem 1.5rem', boxShadow:'0 2px 6px rgba(0,0,0,0.06)', borderLeft:`4px solid ${color}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                          <h3 style={{ margin:0, fontWeight:700, color:'#222' }}>{icon} {tier.name}</h3>
                          <span style={{ fontWeight:700, color, fontSize:'1.15rem' }}>¥{tier.amount.toLocaleString()}</span>
                        </div>
                        <p style={{ color:'#555', margin:'0 0 0.75rem', lineHeight:1.7, fontSize:'0.9rem' }}>{tier.description}</p>
                        {rem !== null && <p style={{ color:'#888', fontSize:'0.82rem', margin:'0 0 0.75rem' }}>残り {rem} / {tier.max_supporters} 名</p>}
                        <button onClick={() => router.push(`/support/${project.id}?tier=${tier.id}`)}
                          style={{ background:color, color:'#fff', border:'none', padding:'0.6rem 1.4rem', borderRadius:'6px', cursor:'pointer', fontWeight:600, fontSize:'0.9rem' }}>
                          このコースで支援する
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── 右サイドバー ── */}
          <div style={{ flex:'0 0 300px', minWidth:'260px', position:'sticky', top:'72px', alignSelf:'flex-start' }}>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}>
              <p style={{ fontSize:'1.8rem', fontWeight:700, color:'#2a7bd5', margin:'0 0 0.25rem' }}>¥{totalRaised.toLocaleString()}</p>
              <p style={{ color:'#888', fontSize:'0.85rem', margin:'0 0 0.75rem' }}>目標 ¥{goalAmt.toLocaleString()}</p>
              <div style={{ background:'#e8f0f8', borderRadius:'4px', height:'8px', marginBottom:'0.75rem' }}>
                <div style={{ background:'#2a7bd5', width:`${progress}%`, height:'100%', borderRadius:'4px' }} />
              </div>
              <p style={{ fontWeight:700, color:'#2a7bd5', fontSize:'1.1rem', margin:'0 0 1.25rem' }}>{progress}% 達成</p>
              <div style={{ display:'flex', justifyContent:'space-around', padding:'1rem 0', borderTop:'1px solid #f0f0f0', borderBottom:'1px solid #f0f0f0', marginBottom:'1.25rem' }}>
                <div style={{ textAlign:'center' }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:'1.3rem', color:'#333' }}>{supporters.length}</p>
                  <p style={{ margin:'2px 0 0', color:'#888', fontSize:'0.8rem' }}>支援者</p>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:'1.3rem', color: daysLeft<=3 ? '#e55':'#333' }}>{daysLeft}</p>
                  <p style={{ margin:'2px 0 0', color:'#888', fontSize:'0.8rem' }}>残り日数</p>
                </div>
              </div>
              <button onClick={() => router.push(`/support/${project.id}`)}
                style={{ width:'100%', background:'linear-gradient(135deg,#2a7bd5,#1a9fd6)', color:'#fff', border:'none', padding:'0.9rem', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'1rem', marginBottom:'0.75rem' }}>
                🙌 このプロジェクトを支援する
              </button>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(projectUrl)}&text=${encodeURIComponent(project.title)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, textAlign:'center', background:'#1da1f2', color:'#fff', padding:'0.55rem', borderRadius:'6px', textDecoration:'none', fontSize:'0.82rem', fontWeight:600 }}>𝕏 シェア</a>
                <a href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(projectUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, textAlign:'center', background:'#06c755', color:'#fff', padding:'0.55rem', borderRadius:'6px', textDecoration:'none', fontSize:'0.82rem', fontWeight:600 }}>LINE</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(projectUrl)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, textAlign:'center', background:'#1877f2', color:'#fff', padding:'0.55rem', borderRadius:'6px', textDecoration:'none', fontSize:'0.82rem', fontWeight:600 }}>FB</a>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer style={{ background:'#222', color:'#aaa', textAlign:'center', padding:'2rem 1rem', marginTop:'4rem', fontSize:'0.85rem' }}>
        <p style={{ margin:0 }}>© 2024 CloudFan – 北海道スポーツ支援クラウドファンディング</p>
        <div style={{ marginTop:'0.75rem', display:'flex', justifyContent:'center', gap:'1.5rem' }}>
          <Link href="/"         style={{ color:'#ccc', textDecoration:'none' }}>ホーム</Link>
          <Link href="/projects" style={{ color:'#ccc', textDecoration:'none' }}>プロジェクト一覧</Link>
        </div>
      </footer>
    </div>
  );
}
