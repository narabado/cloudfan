'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Project {
  id: number;
  title: string;
  school: string;
  club: string;
  description: string;
  image_url: string | null;
  goal_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
}

function calcDaysLeft(deadline: string | null): number {
  if (!deadline) return 0;
  const end = new Date(deadline);
  if (isNaN(end.getTime())) return 0;
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

function fmt(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString('ja-JP');
}

export default function TopPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [supporterCounts, setSupporterCounts] = useState<Record<number, number>>({});
  const [raisedAmounts, setRaisedAmounts] = useState<Record<number, number>>({});
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    const load = async () => {
      const { data: pData } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .in('status', ['approved', 'active', '募集中', '承認'])
        .order('created_at', { ascending: false });
      setProjects(pData ?? []);

      const { data: sData } = await supabase
        .from('supporters')
        .select('project_id, status, total_amount');

      const counts: Record<number, number> = {};
      const amounts: Record<number, number> = {};
      (sData ?? []).forEach((s: { project_id: number; status: string; total_amount: any }) => {
        const st = String(s.status ?? '');
        const isApproved = ['approved', '承認', 'active'].includes(st);
        if (isApproved) {
          counts[s.project_id] = (counts[s.project_id] ?? 0) + 1;
          amounts[s.project_id] = (amounts[s.project_id] ?? 0) + (Number(s.total_amount) || 0);
        }
      });
      setSupporterCounts(counts);
      setRaisedAmounts(amounts);
    };
    load();
    return () => clearTimeout(timer);
  }, []);

  const totalAmount = Object.values(raisedAmounts).reduce((s, v) => s + v, 0);
  const totalSupporters = Object.values(supporterCounts).reduce((s, v) => s + v, 0);
  const minDays = projects.length > 0
    ? Math.min(...projects.map((p) => calcDaysLeft(p.deadline)))
    : null;

  // 目標達成プロジェクト（CTAボタン用に最初のプロジェクトIDを取得）
  const firstProject = projects[0] ?? null;

  if (showSplash) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a2e4a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
      <img src="/logo.png" alt="CloudFan" style={{ width: '180px', height: 'auto' }} />
      <p style={{ color: '#4fc3f7', fontSize: '18px', letterSpacing: '0.1em', fontWeight: 'bold' }}>読み込み中...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Noto Sans JP', sans-serif" }}>

      {/* ナビ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#1a2e4a',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '0 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => router.push('/')}>
            <img src="/logo.png" alt="CloudFan" style={{ height: 36 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>CloudFan</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', padding: '8px 14px',
                borderRadius: 8, cursor: 'pointer', fontSize: 14,
                color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              プロジェクト一覧
            </button>
            <button
              onClick={() => document.getElementById('how-to')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', padding: '8px 14px',
                borderRadius: 8, cursor: 'pointer', fontSize: 14,
                color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              支援の流れ
            </button>
            <button
              onClick={() => router.push('/admin')}
              style={{ background: '#d4af37', color: '#1a2e4a', border: 'none',
                padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: 700 }}>
              管理
            </button>
          </div>
        </div>
      </nav>

      {/* ヒーローセクション（指示1：文言刷新＋背景デザイン） */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1a2e4a 40%, #1e4d8c 70%, #2563eb 100%)',
        color: '#fff', padding: '80px 24px 72px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* CSS装飾：シャトル軌道ライン */}
        <style>{`
          @keyframes shuttleLine {
            0% { transform: translateX(-100%) rotate(-30deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translateX(200%) rotate(-30deg); opacity: 0; }
          }
          @keyframes courtPulse {
            0%, 100% { opacity: 0.04; }
            50% { opacity: 0.08; }
          }
        `}</style>

        {/* コートライン（薄く） */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* 縦中央線 */}
          <div style={{ position: 'absolute', left: '50%', top: '10%', bottom: '10%', width: 1, background: 'rgba(255,255,255,0.06)', animation: 'courtPulse 4s ease-in-out infinite' }} />
          {/* 横ネット線 */}
          <div style={{ position: 'absolute', left: '15%', right: '15%', top: '50%', height: 1, background: 'rgba(255,255,255,0.06)', animation: 'courtPulse 4s ease-in-out infinite 1s' }} />
          {/* 外枠 */}
          <div style={{ position: 'absolute', left: '15%', right: '15%', top: '10%', bottom: '10%', border: '1px solid rgba(255,255,255,0.04)', animation: 'courtPulse 4s ease-in-out infinite 2s' }} />
        </div>

        {/* シャトル軌道ライン */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[
            { top: '20%', delay: '0s', width: '35%' },
            { top: '45%', delay: '2.5s', width: '28%' },
            { top: '70%', delay: '5s', width: '40%' },
          ].map((line, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: line.top,
              left: 0,
              width: line.width,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(212,175,55,0.8), transparent)',
              borderRadius: 2,
              animation: `shuttleLine 6s ${line.delay} ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* 背景の丸 */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300,
          background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 400, height: 400,
          background: 'rgba(255,255,255,0.02)', borderRadius: '50%' }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.5)',
            borderRadius: 99, padding: '6px 20px', fontSize: 13, fontWeight: 700,
            marginBottom: 28, letterSpacing: '0.05em', color: '#f5d060',
          }}>
            🏸 北海道バドミントン・スポーツ支援プラットフォーム
          </div>

          {/* 指示1：新メインコピー */}
          <h1 style={{ fontSize: 'clamp(24px, 4.5vw, 46px)', fontWeight: 900,
            lineHeight: 1.3, marginBottom: 20, letterSpacing: '-0.02em' }}>
            北海道から、世界へ。<br />
            コートに懸ける青春を、<br />
            <span style={{ color: '#f5d060' }}>あなたの手で「勝利」に変える。</span>
          </h1>

          {/* 指示1：新サブコピー */}
          <p style={{ fontSize: 'clamp(13px, 1.8vw, 16px)', opacity: 0.9,
            lineHeight: 2.0, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px',
            color: 'rgba(255,255,255,0.88)' }}>
            物価高騰や遠征費の壁に挑む、道内のバドミントン部・クラブチーム。<br />
            彼らの「あと一歩」を支える、クラウドファンディング・プラットフォーム。
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: '#d4af37', color: '#1a2e4a', border: 'none',
                padding: '16px 40px', borderRadius: 40, fontSize: 16,
                fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(212,175,55,0.5)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              🏸 今すぐ応援する →
            </button>
            <button
              onClick={() => document.getElementById('how-to')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'rgba(255,255,255,0.12)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '16px 32px', borderRadius: 40, fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}>
              支援の流れを見る
            </button>
          </div>
        </div>
      </div>

      {/* 数字セクション（指示2：勢い演出） */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '28px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
          {[
            { label: '総支援金額',         value: '¥' + fmt(totalAmount),                icon: '🪙', highlight: true },
            { label: '支援者数',           value: fmt(totalSupporters) + '人',            icon: '🤜', highlight: false },
            { label: '募集中プロジェクト', value: projects.length + '件',                 icon: '🏸', highlight: false },
            { label: '最短残り日数',       value: minDays !== null ? minDays + '日' : '—', icon: '⏰', highlight: false },
          ].map((s) => (
            <div key={s.label} style={{ padding: '10px 0' }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
              {/* 指示2：総支援金額だけ青色・太字 */}
              <div style={{
                fontSize: 'clamp(18px,3vw,28px)',
                fontWeight: 900,
                color: s.highlight ? '#2563eb' : '#1a2e4a',
                textShadow: s.highlight ? '0 0 20px rgba(37,99,235,0.3)' : 'none',
              }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* プロジェクトセクション（指示3：カード強化） */}
      <div id="projects" style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a2e4a', marginBottom: 8 }}>
            🏸 募集中のプロジェクト
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            北海道のバドミントン部・クラブチームへの支援を集めています
          </p>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏸</div>
            <p>現在募集中のプロジェクトはありません</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            // 指示3：カード大きく（1件なら1列大きく、複数なら2列）
            gridTemplateColumns: projects.length === 1
              ? '1fr'
              : 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: 32,
            maxWidth: projects.length === 1 ? 680 : '100%',
            margin: '0 auto',
          }}>
            {projects.map((p) => {
              const raised = raisedAmounts[p.id] ?? 0;
              const goal = Number((p as any)['目的'] ?? (p as any)['goal'] ?? p.goal_amount ?? 0) || 0;
              const rawPct = goal > 0 ? Math.round(raised / goal * 100) : 0;
              const pct = Math.min(3000, rawPct);
              const barPct = Math.min(100, rawPct);
              const over100 = rawPct >= 100;
              const daysLeft = calcDaysLeft(p.deadline);
              const count = supporterCounts[p.id] ?? 0;

              return (
                <div key={p.id}
                  style={{
                    background: '#fff', borderRadius: 20, overflow: 'hidden',
                    // 指示3：目標達成カードは強調ボーダー
                    boxShadow: over100
                      ? '0 8px 40px rgba(212,175,55,0.35), 0 2px 16px rgba(0,0,0,0.1)'
                      : '0 2px 16px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: over100 ? '2px solid #d4af37' : '1px solid #e5e7eb',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = over100
                      ? '0 20px 60px rgba(212,175,55,0.4), 0 4px 24px rgba(0,0,0,0.15)'
                      : '0 12px 36px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = over100
                      ? '0 8px 40px rgba(212,175,55,0.35), 0 2px 16px rgba(0,0,0,0.1)'
                      : '0 2px 16px rgba(0,0,0,0.08)';
                  }}>

                  {/* 指示3：目標達成リボン */}
                  {over100 && (
                    <div style={{
                      position: 'absolute', top: 18, left: -8, zIndex: 10,
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#fff', fontSize: 11, fontWeight: 800,
                      padding: '6px 18px 6px 14px',
                      clipPath: 'polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%)',
                      boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
                      letterSpacing: '0.03em',
                    }}>
                      🎯 目標達成！ネクストゴール挑戦中
                    </div>
                  )}

                  <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: '#e2e8f0' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%',
                        background: 'linear-gradient(135deg,#1a2e4a,#2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 64 }}>🏸</div>
                    )}
                    <div style={{ position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 55%)' }} />
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      background: daysLeft <= 7 ? '#dc2626' : '#1a2e4a',
                      color: '#fff', padding: '4px 12px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {daysLeft === 0 ? '期限未設定' : '残り' + daysLeft + '日'}
                    </div>
                    <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18 }}>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '0 0 5px' }}>
                        {p.school}{p.club ? ' · ' + p.club : ''}
                      </p>
                      <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                        {p.title}
                      </h3>
                    </div>
                  </div>

                  <div style={{ padding: '20px 24px 24px' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 26, fontWeight: 900, color: '#1a2e4a' }}>¥{fmt(raised)}</span>
                        <span style={{
                          fontSize: 15, fontWeight: 800,
                          color: over100 ? '#d97706' : '#2563eb',
                          background: over100 ? 'rgba(217,119,6,0.1)' : 'rgba(37,99,235,0.1)',
                          padding: '3px 10px', borderRadius: 20,
                        }}>{pct}%達成</span>
                      </div>
                      <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: barPct + '%',
                          background: over100
                            ? 'linear-gradient(90deg,#d97706,#fbbf24,#fde68a)'
                            : 'linear-gradient(90deg,#1a56db,#3b82f6)',
                          borderRadius: 5, transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>目標: ¥{fmt(goal)}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>👥 {fmt(count)}名が支援</span>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.7, marginBottom: 18,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {p.description}
                    </p>

                    {/* 指示3：ボタン強調（目標達成カードは黄色ボタン） */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                      <button
                        onClick={() => router.push('/projects/' + p.id)}
                        style={{ padding: '13px 8px', border: '2px solid #1a2e4a',
                          borderRadius: 12, background: '#fff', color: '#1a2e4a',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        詳細を見る
                      </button>
                      <button
                        onClick={() => router.push('/projects/' + p.id + '#tiers')}
                        style={{
                          padding: '13px 8px', border: 'none', borderRadius: 12,
                          // 指示3：目標達成カードは黄色・最強調
                          background: over100
                            ? 'linear-gradient(135deg,#d4af37,#f5d060)'
                            : 'linear-gradient(135deg,#1a2e4a,#2563eb)',
                          color: over100 ? '#1a2e4a' : '#fff',
                          fontWeight: 800, fontSize: 14, cursor: 'pointer',
                          boxShadow: over100
                            ? '0 4px 16px rgba(212,175,55,0.5)'
                            : '0 4px 16px rgba(37,99,235,0.3)',
                          letterSpacing: '0.02em',
                        }}>
                        {over100 ? '🏆 今すぐ応援する（寄付へ）' : '⭐ 今すぐ支援'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 活動支援セクション */}
      <div style={{ background: '#f0f4ff', padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a2e4a', marginBottom: 8 }}>
              🏸 こんな活動を支援できます
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              北海道のバドミントン部・クラブチームが抱えるお悩みをみんなで解決
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
            {[
              { icon: '✈️', title: '遠征費・交通費',      desc: '道外・全国大会への遠征費用を支援' },
              { icon: '🏸', title: '用具・ユニフォーム', desc: 'ラケット・シューズ・ウェアの購入支援' },
              { icon: '🏆', title: '大会参加費',          desc: '全道・全国大会への出場費用を支援' },
              { icon: '🏋️', title: '施設・練習環境',      desc: '練習場・施設使用料の費用を支援' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#fff', borderRadius: 14,
                padding: '24px 20px', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e8f0fe' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a2e4a', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 支援の流れ */}
      <div id="how-to" style={{ background: '#f9fafb', padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800,
            color: '#1a2e4a', marginBottom: 48 }}>支援の流れ</h2>
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24 }}>
            {[
              { step: '01', icon: '🔍', title: 'プロジェクトを探す', desc: '支援したいチームを見つけましょう' },
              { step: '02', icon: '💎', title: '支援プランを選ぶ',   desc: '¥1,000〜好きな金額のプランを選択' },
              { step: '03', icon: '📝', title: 'フォームに入力',     desc: 'お名前とメールアドレスを入力' },
              { step: '04', icon: '💳', title: 'お支払いで支援完了', desc: '振込コードをメールで受け取り支払い' },
            ].map((s) => (
              <div key={s.step} style={{ background: '#fff', borderRadius: 14,
                padding: 24, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ width: 48, height: 48,
                  background: 'linear-gradient(135deg,#1a2e4a,#2563eb)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 14px',
                  fontSize: 14, fontWeight: 800, color: '#fff' }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2e4a', marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* 指示4：支援の流れ下の大きなCTAボタン */}
          {firstProject && (
            <div style={{ textAlign: 'center', marginTop: 56 }}>
              <p style={{ color: '#4b5563', fontSize: 15, marginBottom: 20, fontWeight: 600 }}>
                📣 41年ぶりの全道優勝！北星学園女子バドミントン部が全国を目指しています
              </p>
              <button
                onClick={() => router.push('/projects/' + firstProject.id + '#tiers')}
                style={{
                  background: 'linear-gradient(135deg,#d4af37,#f5d060)',
                  color: '#1a2e4a', border: 'none',
                  padding: '20px 48px', borderRadius: 50,
                  fontSize: 17, fontWeight: 900, cursor: 'pointer',
                  boxShadow: '0 6px 32px rgba(212,175,55,0.5)',
                  letterSpacing: '0.03em',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                🏆 現在募集中のプロジェクト（北星女子）を応援する
              </button>
              <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 12 }}>
                ※ クリックで支援ページへ移動します
              </p>
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <footer style={{ background: '#1a2e4a', color: '#fff', padding: '36px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <img src="/logo.png" alt="CloudFan" style={{ height: 28 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <span style={{ fontSize: 20, fontWeight: 800 }}>CloudFan</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              北海道バドミントン・スポーツ活動支援プラットフォーム
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <button onClick={() => router.push('/admin')}
              style={{ background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13 }}>
              管理ログイン
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '16px auto 0',
          paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center', fontSize: 12, opacity: 0.4 }}>
          © 2025 CloudFan. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
