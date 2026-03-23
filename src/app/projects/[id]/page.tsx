'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Tier {
  id: number;
  project_id: number;
  name: string;
  amount: number;
  description: string;
  max_supporters: number | null;
  current_supporters: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  story: string;
  school: string;
  club: string;
  goal_amount: number;
  current_amount: number;
  deadline: string;
  status: string;
  youtube_url: string | null;
  images: string[] | null;
  region: string;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number>(0);

  useEffect(() => {
    const projectId = params.id as string;
    fetchProject(projectId);
    fetchTiers(projectId);
  }, [params.id]);

  async function fetchProject(id: string) {
    const { data, error } = await supabase
      .from('crowdfunding_projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      setError('プロジェクトが見つかりませんでした');
    } else {
      setProject(data);
    }
    setLoading(false);
  }

  async function fetchTiers(id: string) {
    const { data } = await supabase
      .from('project_tiers')
      .select('*')
      .eq('project_id', id)
      .order('amount', { ascending: true });
    if (data) setTiers(data);
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f7f9fc' }}>
      <p style={{ color: '#1a3a5c', fontSize: '1.1rem' }}>読み込み中...</p>
    </div>
  );

  if (error || !project) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f7f9fc' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#e55', marginBottom: '1rem' }}>{error || 'プロジェクトが見つかりません'}</p>
        <Link href="/" style={{ color: '#1a6fc4' }}>トップに戻る</Link>
      </div>
    </div>
  );

  const progress = Math.min(100, Math.round((project.current_amount / project.goal_amount) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(project.deadline).getTime() - Date.now()) / 86400000));
  const validImages = (project.images ?? []).filter(url => url && url.trim() !== '');

  return (
    <div style={{ background: '#f7f9fc', minHeight: '100vh' }}>

      {/* ヘッダー */}
      <header style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2a6496 100%)', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          ⚽ CloudFan
        </Link>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/" style={{ color: '#cde', textDecoration: 'none', fontSize: '0.95rem' }}>ホーム</Link>
          <Link href="/projects" style={{ color: '#cde', textDecoration: 'none', fontSize: '0.95rem' }}>プロジェクト一覧</Link>
        </nav>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* タイトル */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <span style={{ background: '#e8f0fe', color: '#1a3a5c', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}>{project.school}</span>
            <span style={{ background: '#e8f0fe', color: '#1a3a5c', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}>{project.club}</span>
            <span style={{ background: '#fff3cd', color: '#856404', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem' }}>📍 {project.region}</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a3a5c', marginBottom: '0.5rem' }}>{project.title}</h1>
          <p style={{ color: '#4a6080', fontSize: '1rem', lineHeight: 1.6 }}>{project.description}</p>
        </div>

        {/* ── 画像ギャラリー ── */}
        {validImages.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {/* メイン画像 */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              <img
                src={validImages[selectedImage]}
                alt={`${project.title} - 画像${selectedImage + 1}`}
                style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* サムネイル（複数枚のときのみ表示） */}
            {validImages.length > 1 && (
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                {validImages.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    style={{
                      width: '88px', height: '64px', borderRadius: '8px', overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedImage === i ? '3px solid #1a6fc4' : '3px solid transparent',
                      opacity: selectedImage === i ? 1 : 0.6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <img
                      src={url}
                      alt={`サムネイル${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 進捗 */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a6fc4' }}>¥{project.current_amount.toLocaleString()}</span>
            <span style={{ color: '#888', fontSize: '0.9rem' }}>目標 ¥{project.goal_amount.toLocaleString()}</span>
          </div>
          <div style={{ background: '#e8f0fe', borderRadius: '8px', height: '12px', marginBottom: '0.8rem' }}>
            <div style={{ background: 'linear-gradient(90deg, #1a6fc4, #2a9fd6)', width: `${progress}%`, height: '100%', borderRadius: '8px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <span style={{ color: '#4a6080' }}>達成率: <strong style={{ color: '#1a6fc4' }}>{progress}%</strong></span>
            <span style={{ color: '#4a6080' }}>残り: <strong style={{ color: '#e55' }}>{daysLeft}日</strong></span>
          </div>
        </div>

        {/* 動画 */}
        {project.youtube_url && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a3a5c', marginBottom: '1rem' }}>🎥 紹介動画</h2>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${
                  project.youtube_url.includes('youtu.be/')
                    ? project.youtube_url.split('youtu.be/')[1]
                    : project.youtube_url.split('v=')[1]?.split('&')[0]
                }`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* ストーリー */}
        {project.story && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a3a5c', marginBottom: '1rem' }}>📖 私たちのストーリー</h2>
            <p style={{ color: '#4a6080', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{project.story}</p>
          </div>
        )}

        {/* 支援ティア */}
        {tiers.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a3a5c', marginBottom: '1rem' }}>🎁 支援コース</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tiers.map(tier => (
                <div key={tier.id} style={{ background: '#fff', borderRadius: '12px', padding: '1.2rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '2px solid #e8f0fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontWeight: 700, color: '#1a3a5c', margin: 0 }}>{tier.name}</h3>
                    <span style={{ fontWeight: 700, color: '#1a6fc4', fontSize: '1.2rem' }}>¥{tier.amount.toLocaleString()}</span>
                  </div>
                  <p style={{ color: '#4a6080', margin: '0 0 0.8rem', lineHeight: 1.6 }}>{tier.description}</p>
                  {tier.max_supporters && (
                    <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 0.8rem' }}>
                      残り {Math.max(0, tier.max_supporters - tier.current_supporters)} / {tier.max_supporters} 名
                    </p>
                  )}
                  <button
                    onClick={() => router.push(`/support/${project.id}?tier=${tier.id}`)}
                    style={{ background: 'linear-gradient(90deg, #1a6fc4, #2a9fd6)', color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
                  >
                    このコースで支援する
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/projects" style={{ color: '#1a6fc4', textDecoration: 'none', fontSize: '0.95rem' }}>← プロジェクト一覧に戻る</Link>
        </div>

      </main>
    </div>
  );
}