'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// =============================================
// 型定義
// =============================================
interface Tier {
  name: string;
  amount: number;
  description: string;
}

interface Project {
  id: number;
  school: string;
  club: string;
  title: string;
  description: string;
  story: string;
  goal: number;
  deadline: string;
  region: string;
  youtube_url: string;
  images: string[];
  tiers: Tier[];
  status: string;
}

interface Supporter {
  project_id: number;
  total_amount: number;
}

// =============================================
// ユーティリティ
// =============================================
function toISODate(d: string): string {
  if (!d) return '';
  if (d.includes('T')) return d.split('T')[0];
  const m = d.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  return d;
}

function calcDaysLeft(deadline: string): number {
  if (!deadline) return 0;
  const end = new Date(toISODate(deadline));
  const now = new Date();
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

function fmt(n: number): string {
  return n.toLocaleString('ja-JP');
}

// =============================================
// メインコンポーネント
// =============================================
export default function TopPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [supporterMap, setSupporterMap] = useState<Record<number, { total: number; count: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // プロジェクト取得（募集中のみ）
        const { data: pData, error: pErr } = await supabase
          .from('crowdfunding_projects')
          .select('*')
          .eq('status', '募集中')
          .order('id', { ascending: true });

        if (pErr) console.error('projects error:', pErr);

        // 支援者取得（承認済み）— approved と 承認 両方対応
        const { data: sData, error: sErr } = await supabase
          .from('supporters')
          .select('project_id, total_amount, status');

        if (sErr) console.error('supporters error:', sErr);

        const map: Record<number, { total: number; count: number }> = {};
        (sData ?? [])
          .filter((s: any) => s.status === 'approved' || s.status === '承認' || s.status === '承認済')
          .forEach((s: any) => {
            const pid = s.project_id ?? 1;
            if (!map[pid]) map[pid] = { total: 0, count: 0 };
            map[pid].total += s.total_amount ?? 0;
            map[pid].count += 1;
          });

        setProjects(pData ?? []);
        setSupporterMap(map);
      } catch (e) {
        console.error('load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 全体統計
  const totalAmount    = Object.values(supporterMap).reduce((s, v) => s + v.total, 0);
  const totalSupporters = Object.values(supporterMap).reduce((s, v) => s + v.count, 0);
  const minDays = projects.length > 0
    ? Math.min(...projects.map((p) => calcDaysLeft(p.deadline)))
    : 0;

  // ── ナビバー ──
  const NavBar = () => (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => router.push('/')}>
          <div style={{ width: 36, height: 36,
            background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>C</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, color: '#1e3a5f' }}>CloudFan</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', padding: '8px 14px',
              borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 500 }}>
            プロジェクト一覧
          </button>
          <button
            onClick={() => document.getElementById('how-to')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', padding: '8px 14px',
              borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 500 }}>
            支援の流れ
          </button>
          <button
            onClick={() => router.push('/admin')}
            style={{ background: '#1e3a5f', color: '#fff', border: 'none',
              padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            管理者
          </button>
        </div>
      </div>
    </nav>
  );

  // ── ヒーロー ──
  const Hero = () => (
    <div style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#2563eb 50%,#0ea5e9 100%)',
      color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(4px)', borderRadius: 20, padding: '6px 20px',
          fontSize: 13, fontWeight: 600, marginBottom: 24, letterSpacing: '0.05em' }}>
          🏆 北海道部活クラウドファンディング
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800,
          lineHeight: 1.3, marginBottom: 20 }}>
          北海道の部活動を<br />みんなで応援しよう
        </h1>
        <p style={{ fontSize: 'clamp(15px,2vw,18px)', opacity: 0.9,
          lineHeight: 1.7, marginBottom: 36 }}>
          夢を持つ学生アスリートたちを<br />あなたの支援で後押ししてください
        </p>
        <button
          onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ background: '#fff', color: '#1e3a5f', border: 'none',
            padding: '16px 40px', borderRadius: 40, fontSize: 16,
            fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          プロジェクトを見る →
        </button>
      </div>
    </div>
  );

  // ── 統計バー ──
  const StatsBar = () => (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'center' }}>
        {[
          { label: '累計支援額',          value: `¥${fmt(totalAmount)}` },
          { label: '支援者数',            value: `${fmt(totalSupporters)}人` },
          { label: '募集中プロジェクト',  value: `${projects.length}件` },
          { label: '残り日数',            value: projects.length > 0 ? `${minDays}日` : '—' },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, color: '#1e3a5f' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── プロジェクトカード ──
  const ProjectCard = ({ project }: { project: Project }) => {
    const stats = supporterMap[project.id] ?? { total: 0, count: 0 };
    const pct = project.goal > 0
      ? Math.min(100, Math.round((stats.total / project.goal) * 100)) : 0;
    const daysLeft = calcDaysLeft(project.deadline);
    const minTier = project.tiers?.length > 0
      ? Math.min(...project.tiers.map((t) => t.amount)) : 1000;
    const mainImage = project.images?.[0] ?? null;

    return (
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.14)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.08)';
        }}
      >
        {/* カードヘッダー */}
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          {mainImage ? (
            <img src={mainImage} alt={project.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%',
              background: 'linear-gradient(135deg,#1e3a5f,#2563eb,#0ea5e9)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 12, right: 12,
            background: daysLeft <= 7 ? '#dc2626' : '#1e3a5f',
            color: '#fff', padding: '4px 12px', borderRadius: 20,
            fontSize: 12, fontWeight: 700 }}>
            残り{daysLeft}日
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '0 0 2px' }}>
              {project.school}
            </p>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              {project.title}
            </h3>
          </div>
        </div>

        {/* カード本文 */}
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f' }}>
                ¥{fmt(stats.total)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700,
                color: pct >= 100 ? '#059669' : '#2563eb' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`,
                background: pct >= 100
                  ? 'linear-gradient(90deg,#059669,#34d399)'
                  : 'linear-gradient(90deg,#2563eb,#0ea5e9)',
                borderRadius: 4, transition: 'width 0.8s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>目標 ¥{fmt(project.goal)}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{fmt(stats.count)}人が支援</span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 16,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => router.push(`/projects/${project.id}`)}
              style={{ padding: '11px 8px', border: '2px solid #1e3a5f',
                borderRadius: 10, background: '#fff', color: '#1e3a5f',
                fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              詳細を見る
            </button>
            <button
              onClick={() => router.push(`/support?project_id=${project.id}`)}
              style={{ padding: '11px 8px', border: 'none', borderRadius: 10,
                background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ¥{fmt(minTier)}〜 支援する
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── 支援の流れ ──
  const HowTo = () => (
    <div id="how-to" style={{ background: '#f9fafb', padding: '64px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 800,
          color: '#1e3a5f', marginBottom: 48 }}>支援の流れ</h2>
        <div style={{ display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 24 }}>
          {[
            { step: '01', icon: '🔍', title: 'プロジェクトを探す', desc: '応援したいチームを見つけましょう' },
            { step: '02', icon: '💰', title: '支援コースを選ぶ', desc: '¥1,000〜好きな金額・コースを選択' },
            { step: '03', icon: '📝', title: 'フォームに入力',   desc: 'お名前とメールアドレスを入力' },
            { step: '04', icon: '🏦', title: '振込で支援完了',   desc: '振込コードをメールで受け取り振込' },
          ].map((s) => (
            <div key={s.step} style={{ background: '#fff', borderRadius: 14,
              padding: 24, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ width: 48, height: 48,
                background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 12px',
                fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {s.step}
              </div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700,
                color: '#1e3a5f', marginBottom: 6 }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── フッター ──
  const Footer = () => (
    <footer style={{ background: '#1e3a5f', color: '#fff', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>CloudFan</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            北海道の部活動を応援するクラウドファンディング
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}>
            管理者ログイン
          </button>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: '16px auto 0',
        paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)',
        textAlign: 'center', fontSize: 12, opacity: 0.5 }}>
        © 2025 CloudFan. All rights reserved.
      </div>
    </footer>
  );

  // ── レンダリング ──
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Noto Sans JP', sans-serif" }}>
      <NavBar />
      <Hero />
      <StatsBar />

      <div id="projects" style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1e3a5f', marginBottom: 8 }}>
            募集中のプロジェクト
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            あなたの支援が夢への第一歩になります
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
            読み込み中...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏅</div>
            <p>現在募集中のプロジェクトはありません</p>
          </div>
        ) : (
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 28 }}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>

      <HowTo />
      <Footer />
    </div>
  );
}
