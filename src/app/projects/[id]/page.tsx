'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const tierColor: Record<string, string> = {
  ブロンズ: '#cd7f32', シルバー: '#aaa', ゴールド: '#d4af37', プラチナ: '#5be', レジェンド: '#e55',
};
const tierIcon: Record<string, string> = {
  ブロンズ: '🥉', シルバー: '🥈', ゴールド: '🥇', プラチナ: '💎', レジェンド: '👑',
};

interface Tier {
  id: number;
  name: string;
  amount: number;
  description: string;
  max_supporters: number | null;
  current_supporters: number;
}

interface Supporter {
  name: string;
  tier: string;
  total_amount: number;
  message: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  story: string;
  school: string;
  club: string;
  goal_amount: number | null;
  goal: number | null;
  current_amount: number | null;
  deadline: string;
  status: string;
  youtube_url: string | null;
  images: string[] | null;
  region: string;
}

function toISODate(d: string): string {
  if (!d) return '';
  if (d.includes('T')) return d.split('T')[0];
  const m = d.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return d;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const [project, setProject]       = useState<Project | null>(null);
  const [tiers, setTiers]           = useState<Tier[]>([]);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      supabase.from('crowdfunding_projects').select('*').eq('id', projectId).single(),
      supabase.from('project_tiers').select('*').eq('project_id', projectId).order('amount', { ascending: true }),
      supabase.from('supporters').select('name,tier,total_amount,message').eq('status','approved').eq('project_id', projectId).order('total_amount',{ascending:false}),
    ]).then(([pRes, tRes, sRes]) => {
      if (pRes.data)  setProject(pRes.data);
      if (tRes.data)  setTiers(tRes.data);
      if (sRes.data)  setSupporters(sRes.data as Supporter[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f5f7fa' }}>
      <p style={{ color:'#0a1628' }}>読み込み中...</p>
    </div>
  );
  if (!project) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ color:'#e55', marginBottom:'1rem' }}>プロジェクトが見つかりません</p>
        <Link href="/" style={{ color:'#d4af37' }}>トップに戻る</Link>
      </div>
    </div>
  );

  const goalAmt    = project.goal_amount ?? project.goal ?? 1;
  const currentAmt = project.current_amount ?? supporters.reduce((s,r)=>s+(r.total_amount||0),0);
  const pct        = goalAmt > 0 ? Math.min(100, Math.round((currentAmt / goalAmt) * 100)) : 0;
  const daysLeft   = project.deadline
    ? Math.max(0, Math.ceil((new Date(toISODate(project.deadline)).getTime() - Date.now()) / 86400000))
    : 0;
  const validImages = (project.images ?? []).filter(u => u && u.trim() !== '');

  const siteUrl   = `https://cloudfan.vercel.app/projects/${projectId}`;
  const shareText = encodeURIComponent(`${project.title} を応援しています！`);
  const twUrl  = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(siteUrl)}`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(project.title+'\n'+siteUrl)}`;
  const fbUrl  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;

  return (
    <>
      <style>{`
        *{box-sizing:border-box;}
        .pj-nav{background:#0a1628;color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #d4af37;position:sticky;top:0;z-index:100;}
        .pj-nav-title{font-size:16px;font-weight:bold;color:#d4af37;text-decoration:none;}
        .pj-nav-links{display:flex;gap:16px;}
        .pj-nav-link{color:#ccc;font-size:13px;text-decoration:none;}
        .pj-nav-link:hover{color:#d4af37;}
        .pj-layout{max-width:1100px;margin:0 auto;padding:32px 20px;display:flex;gap:32px;align-items:flex-start;}
        .pj-main{flex:1;min-width:0;}
        .pj-sidebar{width:320px;flex-shrink:0;position:sticky;top:80px;}
        .pj-sidebar-mobile{display:none;}
        .pj-sidebar-desktop{display:block;}
        .pj-prog-bg{background:#e2e8f0;border-radius:99px;height:12px;overflow:hidden;margin:8px 0;}
        .pj-prog-fill{background:linear-gradient(90deg,#d4af37,#f0c040);border-radius:99px;height:100%;transition:width .6s;}
        .pj-tier-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;}
        .pj-sup-table{width:100%;border-collapse:collapse;font-size:14px;}
        .pj-sup-table th{background:#0a1628;color:#fff;padding:10px 14px;text-align:left;}
        .pj-sup-table td{padding:10px 14px;border-bottom:1px solid #e2e8f0;}
        .pj-sup-table tr:nth-child(even) td{background:#f9fafb;}
        .pj-share{display:flex;gap:8px;}
        .pj-share-btn{flex:1;text-align:center;border-radius:8px;padding:9px 4px;font-size:13px;font-weight:bold;text-decoration:none;}
        .pj-thumb{cursor:pointer;border-radius:8px;overflow:hidden;transition:all .2s;}
        @media(max-width:767px){
          .pj-nav{padding:12px 16px;}
          .pj-nav-title{font-size:13px;}
          .pj-layout{flex-direction:column;padding:0 0 32px;gap:0;}
          .pj-main{padding:16px;}
          .pj-sidebar{width:100%;position:static;}
          .pj-sidebar-mobile{display:block;padding:0 16px 16px;}
          .pj-sidebar-desktop{display:none;}
          .pj-tier-grid{grid-template-columns:1fr;}
          .pj-sup-table{font-size:12px;}
        }
      `}</style>

      <div style={{ fontFamily:'sans-serif', minHeight:'100vh', background:'#f5f7fa' }}>

        {/* ── ナビ ── */}
        <nav className="pj-nav">
          <Link href="/" className="pj-nav-title">⚽ CloudFan</Link>
          <div className="pj-nav-links">
            <Link href="/" className="pj-nav-link">← トップ</Link>
            <Link href="/projects" className="pj-nav-link">一覧</Link>
            <Link href={`/admin/project-edit?id=${projectId}`} className="pj-nav-link">✏️ 編集</Link>
          </div>
        </nav>

        {/* ── ヒーロー ── */}
        <div style={{ background:'linear-gradient(135deg,#0a1628 0%,#1a3060 100%)', padding:'40px 20px', textAlign:'center' }}>
          <div style={{ display:'inline-block', background:'#d4af37', color:'#0a1628', borderRadius:6, padding:'3px 12px', fontSize:12, fontWeight:'bold', marginBottom:12 }}>
            {project.status ?? '募集中'}
          </div>
          <h1 style={{ color:'#fff', fontSize:'clamp(18px,4vw,28px)', fontWeight:'bold', maxWidth:700, margin:'0 auto 8px', lineHeight:1.4 }}>
            {project.title}
          </h1>
          <p style={{ color:'#aac', fontSize:14 }}>{project.school}　{project.club}</p>
        </div>

        {/* ── モバイルサイドバー ── */}
        <div className="pj-sidebar-mobile">
          <SidebarCard pct={pct} goalAmt={goalAmt} currentAmt={currentAmt} supporters={supporters} daysLeft={daysLeft} deadline={project.deadline} twUrl={twUrl} lineUrl={lineUrl} fbUrl={fbUrl} projectId={projectId} router={router} />
        </div>

        <div className="pj-layout">
          <div className="pj-main">

            {/* ── 画像ギャラリー ── */}
            {validImages.length > 0 && (
              <section style={{ background:'#fff', borderRadius:12, padding:20, marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <h2 style={{ color:'#0a1628', fontSize:18, borderBottom:'2px solid #d4af37', paddingBottom:8, marginBottom:16 }}>🖼️ 写真</h2>
                <div style={{ borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                  <img
                    src={validImages[selectedImg]}
                    alt={`${project.title} 画像${selectedImg+1}`}
                    style={{ width:'100%', height:'380px', objectFit:'cover', display:'block' }}
                  />
                </div>
                {validImages.length > 1 && (
                  <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                    {validImages.map((url, i) => (
                      <div
                        key={i}
                        className="pj-thumb"
                        onClick={() => setSelectedImg(i)}
                        style={{ width:80, height:60, border: i===selectedImg ? '3px solid #d4af37' : '3px solid transparent', opacity: i===selectedImg ? 1 : 0.6 }}
                      >
                        <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── ストーリー ── */}
            <section style={{ background:'#fff', borderRadius:12, padding:24, marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <h2 style={{ color:'#0a1628', fontSize:18, borderBottom:'2px solid #d4af37', paddingBottom:8, marginBottom:16 }}>📖 プロジェクト詳細</h2>
              <p style={{ lineHeight:1.8, color:'#333', whiteSpace:'pre-wrap', fontSize:15 }}>{project.description}</p>
              {project.story && (
                <p style={{ lineHeight:1.8, color:'#333', whiteSpace:'pre-wrap', fontSize:15, marginTop:12 }}>{project.story}</p>
              )}
            </section>

            {/* ── YouTube ── */}
            {project.youtube_url && (
              <section style={{ background:'#fff', borderRadius:12, padding:24, marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <h2 style={{ color:'#0a1628', fontSize:18, borderBottom:'2px solid #d4af37', paddingBottom:8, marginBottom:16 }}>🎬 紹介動画</h2>
                <div style={{ position:'relative', paddingBottom:'56.25%', height:0, borderRadius:8, overflow:'hidden' }}>
                  <iframe
                    src={project.youtube_url.replace('watch?v=','embed/')}
                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }}
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* ── ティア ── */}
            {tiers.length > 0 && (
              <section style={{ background:'#fff', borderRadius:12, padding:24, marginBottom:24, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <h2 style={{ color:'#0a1628', fontSize:18, borderBottom:'2px solid #d4af37', paddingBottom:8, marginBottom:16 }}>🎁 支援ティア・特典</h2>
                <div className="pj-tier-grid">
                  {tiers.map((t, i) => (
                    <div key={i} style={{ border:`2px solid ${tierColor[t.name]??'#ddd'}`, borderRadius:10, padding:16 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ background:tierColor[t.name]??'#ddd', color:'#fff', borderRadius:6, padding:'2px 10px', fontSize:12, fontWeight:'bold' }}>
                          {tierIcon[t.name]??''} {t.name}
                        </span>
                        <span style={{ fontWeight:'bold', color:'#0a1628' }}>¥{t.amount.toLocaleString()}〜</span>
                      </div>
                      <p style={{ fontSize:13, color:'#555', margin:0, lineHeight:1.6 }}>{t.description}</p>
                      <button
                        onClick={() => router.push(`/support?project=${projectId}&tier=${encodeURIComponent(t.name)}&amount=${t.amount}`)}
                        style={{ display:'block', width:'100%', marginTop:12, background:tierColor[t.name]??'#d4af37', color:'#fff', border:'none', borderRadius:6, padding:8, fontSize:13, fontWeight:'bold', cursor:'pointer' }}>
                        このティアで支援
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── 支援者 ── */}
            <section style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
              <h2 style={{ color:'#0a1628', fontSize:18, borderBottom:'2px solid #d4af37', paddingBottom:8, marginBottom:16 }}>
                👥 支援者一覧（{supporters.length}名）
              </h2>
              {supporters.length === 0 ? (
                <p style={{ color:'#888', textAlign:'center', padding:32 }}>まだ支援者はいません。最初の支援者になりましょう！</p>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table className="pj-sup-table">
                    <thead><tr><th>名前</th><th>ティア</th><th>金額</th><th>コメント</th></tr></thead>
                    <tbody>
                      {supporters.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:'bold' }}>{s.name}</td>
                          <td><span style={{ color:tierColor[s.tier]??'#333', fontWeight:'bold' }}>{tierIcon[s.tier]??''}{s.tier}</span></td>
                          <td style={{ fontWeight:'bold', color:'#d4af37' }}>¥{(s.total_amount||0).toLocaleString()}</td>
                          <td style={{ color:'#555', fontSize:12 }}>{s.message||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>

          {/* ── デスクトップサイドバー ── */}
          <aside className="pj-sidebar pj-sidebar-desktop">
            <SidebarCard pct={pct} goalAmt={goalAmt} currentAmt={currentAmt} supporters={supporters} daysLeft={daysLeft} deadline={project.deadline} twUrl={twUrl} lineUrl={lineUrl} fbUrl={fbUrl} projectId={projectId} router={router} />
          </aside>
        </div>

      </div>
    </>
  );
}

function SidebarCard({ pct, goalAmt, currentAmt, supporters, daysLeft, deadline, twUrl, lineUrl, fbUrl, projectId, router }:
  { pct:number; goalAmt:number; currentAmt:number; supporters:Supporter[]; daysLeft:number; deadline:string; twUrl:string; lineUrl:string; fbUrl:string; projectId:number; router:ReturnType<typeof useRouter> }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:24, boxShadow:'0 4px 16px rgba(0,0,0,.10)', border:'2px solid #d4af37' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:13, color:'#888' }}>達成率</span>
          <span style={{ fontWeight:'bold', color:'#d4af37', fontSize:18 }}>{pct}%</span>
        </div>
        <div className="pj-prog-bg"><div className="pj-prog-fill" style={{ width:`${pct}%` }} /></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
        {[
          { label:'支援総額', value:`¥${currentAmt.toLocaleString()}`, sub:`目標 ¥${goalAmt.toLocaleString()}` },
          { label:'支援者数', value:`${supporters.length}名`, sub:'' },
          { label:'残り日数', value:`${daysLeft}日`, sub: deadline ? deadline+'まで' : '' },
          { label:'達成率',   value:`${pct}%`, sub:'' },
        ].map(c => (
          <div key={c.label} style={{ background:'#f5f7fa', borderRadius:8, padding:12, textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#888' }}>{c.label}</div>
            <div style={{ fontWeight:'bold', fontSize:18, color:'#0a1628' }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:10, color:'#aaa' }}>{c.sub}</div>}
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push(`/support?project=${projectId}`)}
        style={{ display:'block', width:'100%', background:'linear-gradient(135deg,#d4af37,#f0c040)', color:'#0a1628', border:'none', borderRadius:10, padding:14, fontSize:16, fontWeight:'bold', cursor:'pointer', marginBottom:12, boxShadow:'0 4px 12px rgba(212,175,55,.4)' }}>
        ⚽ このプロジェクトを支援する
      </button>
      <div className="pj-share">
        <a href={twUrl} target="_blank" rel="noreferrer" className="pj-share-btn" style={{ background:'#000', color:'#fff' }}>𝕏 シェア</a>
        <a href={lineUrl} target="_blank" rel="noreferrer" className="pj-share-btn" style={{ background:'#06c755', color:'#fff' }}>LINE</a>
        <a href={fbUrl} target="_blank" rel="noreferrer" className="pj-share-btn" style={{ background:'#1877f2', color:'#fff' }}>Facebook</a>
      </div>
    </div>
  );
}
