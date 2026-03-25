'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Tier {
  id: string;
  name: string;
  amount: number;
  description: string;
  limit: number | null;
  remaining: number | null;
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
  story_blocks?: StoryBlock[];
}

interface StoryBlock {
  title: string;
  body: string;
  image_url: string;
}

const CHAPTER_TITLES = [
  '🔥 なぜ今、支援が必要なのか',
  '🏆 私たちの挑戦と夢',
  '💰 支援金の具体的な使い道',
  '🌟 あなたの支援で変わること',
  '💌 チームからのメッセージ',
];

const EMPTY_BLOCK: StoryBlock = { title: '', body: '', image_url: '' };

export default function ProjectEditForm({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [blocks, setBlocks] = useState<StoryBlock[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_BLOCK }))
  );

  const photoRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crowdfunding_projects')
      .select('*')
      .eq('id', Number(projectId))
      .single();

    if (error) {
      setMessage('プロジェクトの取得に失敗しました');
      setLoading(false);
      return;
    }

    setProject(data);

    if (data.story_blocks && Array.isArray(data.story_blocks)) {
      const loaded = data.story_blocks as StoryBlock[];
      const filled = Array.from({ length: 5 }, (_, i) => loaded[i] ?? { ...EMPTY_BLOCK });
      setBlocks(filled);
    } else if (data.story) {
      try {
        const parsed = JSON.parse(data.story);
        if (Array.isArray(parsed)) {
          const filled = Array.from({ length: 5 }, (_, i) => parsed[i] ?? { ...EMPTY_BLOCK });
          setBlocks(filled);
        }
      } catch {
        // story が JSON でない場合は最初のブロックにセット
        setBlocks(prev => {
          const next = [...prev];
          next[0] = { ...EMPTY_BLOCK, body: data.story ?? '' };
          return next;
        });
      }
    }

    setLoading(false);
  };

  const updateBlock = (index: number, field: keyof StoryBlock, value: string) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleImageUpload = async (index: number, file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `story_block_${projectId}_${index}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setMessage(`画像アップロード失敗: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    updateBlock(index, 'image_url', urlData.publicUrl);
    setMessage(`ブロック${index + 1}の画像をアップロードしました ✅`);
  };

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('crowdfunding_projects')
      .update({
        title: project.title,
        school: project.school,
        club: project.club,
        region: project.region,
        description: project.description,
        goal: project.goal,
        deadline: project.deadline,
        youtube_url: project.youtube_url,
        status: project.status,
        story_blocks: blocks,
      })
      .eq('id', Number(projectId));

    setSaving(false);

    if (error) {
      setMessage(`保存失敗: ${error.message}`);
    } else {
      setMessage('✅ 保存しました！');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '1.1rem', color: '#1a3a5c' }}>
        読み込み中...
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        プロジェクトが見つかりません。
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>
          ✏️ プロジェクト編集
        </h1>
        <Link href="/admin" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>
          ← 管理画面に戻る
        </Link>
      </div>

      {/* メッセージ */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          background: message.includes('失敗') ? '#fef2f2' : '#f0fdf4',
          color: message.includes('失敗') ? '#ef4444' : '#16a34a',
          border: `1px solid ${message.includes('失敗') ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {message}
        </div>
      )}

      {/* 基本情報 */}
      <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e3a5f' }}>
          📋 基本情報
        </h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {[
            { label: 'タイトル', field: 'title' as const },
            { label: '学校名', field: 'school' as const },
            { label: '部活名', field: 'club' as const },
            { label: '地域', field: 'region' as const },
          ].map(({ label, field }) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{label}</label>
              <input
                type="text"
                value={(project[field] as string) ?? ''}
                onChange={e => setProject(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>概要説明</label>
            <textarea
              value={project.description ?? ''}
              onChange={e => setProject(prev => prev ? { ...prev, description: e.target.value } : prev)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>目標金額 (円)</label>
              <input
                type="number"
                value={project.goal ?? 0}
                onChange={e => setProject(prev => prev ? { ...prev, goal: Number(e.target.value) } : prev)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>締切日</label>
              <input
                type="date"
                value={project.deadline ?? ''}
                onChange={e => setProject(prev => prev ? { ...prev, deadline: e.target.value } : prev)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>YouTube URL</label>
            <input
              type="text"
              value={project.youtube_url ?? ''}
              onChange={e => setProject(prev => prev ? { ...prev, youtube_url: e.target.value } : prev)}
              placeholder="https://www.youtube.com/watch?v=..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>ステータス</label>
            <select
              value={project.status ?? 'active'}
              onChange={e => setProject(prev => prev ? { ...prev, status: e.target.value } : prev)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            >
              <option value="active">active（募集中）</option>
              <option value="募集中">募集中</option>
              <option value="closed">closed（終了）</option>
              <option value="終了">終了</option>
            </select>
          </div>
        </div>
      </section>

      {/* ストーリーブロック */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e3a5f' }}>
          📖 ストーリー（5章）
        </h2>
        {blocks.map((block, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                color: 'white',
                borderRadius: '50%',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 'bold', flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {CHAPTER_TITLES[i]}
              </h3>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>見出し（任意）</label>
                <input
                  type="text"
                  value={block.title}
                  onChange={e => updateBlock(i, 'title', e.target.value)}
                  placeholder={CHAPTER_TITLES[i]}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>本文</label>
                <textarea
                  value={block.body}
                  onChange={e => updateBlock(i, 'body', e.target.value)}
                  rows={5}
                  placeholder="この章の内容を入力してください..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>画像</label>
                {block.image_url && (
                  <img
                    src={block.image_url}
                    alt={`ブロック${i + 1}`}
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={photoRefs[i]}
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(i, file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoRefs[i].current?.click()}
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    border: '2px dashed #94a3b8',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#64748b',
                    width: '100%',
                  }}
                >
                  📷 画像をアップロード
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* 保存ボタン */}
      <div style={{ position: 'sticky', bottom: '24px', textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 20px rgba(245,158,11,0.4)',
          }}
        >
          {saving ? '保存中...' : '💾 保存する'}
        </button>
      </div>
    </div>
  );
}



