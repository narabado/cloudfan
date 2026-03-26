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
  image_url: string | null;
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

interface Supporter {
  id: string;
  name: string;
  email: string;
  amount: number;
  tier_id: string | null;
  tier_name: string | null;
  created_at: string;
}

const CHAPTER_TITLES = [
  '🔥 なぜ今、支援が必要なのか',
  '🏸 私たちの挑戦と夢',
  '💰 支援金の具体的な使い道',
  '✨ あなたの支援で変わること',
  '💌 チームからのメッセージ',
];

const EMPTY_BLOCK: StoryBlock = { title: '', body: '', image_url: '' };

// ── マーカープレビュー描画 ──────────────────────────────────────
function renderMarkedPreview(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        style={{
          background: '#fef08a',
          padding: '1px 3px',
          borderRadius: '3px',
          fontWeight: 'bold',
          color: '#78350f',
        }}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function ProjectEditForm({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [blocks, setBlocks] = useState<StoryBlock[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_BLOCK }))
  );
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [heroUploading, setHeroUploading] = useState(false);
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── マーカー用: 各ストーリーブロックの本文textarea参照 ──
  const bodyTextareaRefs = useRef<Array<HTMLTextAreaElement | null>>([
    null, null, null, null, null,
  ]);

  const heroPhotoRef = useRef<HTMLInputElement>(null);
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
    fetchSupporters();
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

    if (data.tiers && Array.isArray(data.tiers)) {
      setTiers(data.tiers);
    } else {
      setTiers([]);
    }

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
        setBlocks(prev => {
          const next = [...prev];
          next[0] = { ...EMPTY_BLOCK, body: data.story ?? '' };
          return next;
        });
      }
    }

    setLoading(false);
  };

  const fetchSupporters = async () => {
    const { data, error } = await supabase
      .from('supporters')
      .select('*')
      .eq('project_id', Number(projectId))
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSupporters(data as Supporter[]);
    }
  };

  const handleDeleteSupporter = async (supporterId: string) => {
    if (!confirm('この支援者のデータを削除しますか？この操作は取り消せません。')) return;
    setDeletingId(supporterId);
    const { error } = await supabase
      .from('supporters')
      .delete()
      .eq('id', supporterId);

    setDeletingId(null);
    if (error) {
      setMessage(`削除失敗: ${error.message}`);
    } else {
      setSupporters(prev => prev.filter(s => s.id !== supporterId));
      setMessage('✅ 支援者のデータを削除しました');
    }
  };

  const resolveAmount = (supporter: Supporter): number => {
    if (supporter.amount && supporter.amount > 0) return supporter.amount;
    const matchedByTierId = tiers.find(t => t.id === supporter.tier_id);
    if (matchedByTierId) return matchedByTierId.amount;
    const matchedByName = tiers.find(t => t.name === supporter.tier_name);
    if (matchedByName) return matchedByName.amount;
    return 0;
  };

  const updateBlock = (index: number, field: keyof StoryBlock, value: string) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number | null) => {
    setTiers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ── マーカーを付ける ──────────────────────────────────────────
  const applyMarker = (index: number) => {
    const textarea = bodyTextareaRefs.current[index];
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    if (start === end) {
      setMessage('⚠️ テキストを選択してからマーカーボタンを押してください');
      setTimeout(() => setMessage(''), 2500);
      return;
    }

    const body = blocks[index].body;
    const selected = body.substring(start, end);

    // 選択範囲がすでに ** で囲まれていたら解除
    if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
      const unwrapped = selected.slice(2, -2);
      const newBody = body.substring(0, start) + unwrapped + body.substring(end);
      updateBlock(index, 'body', newBody);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + unwrapped.length);
      }, 0);
    } else {
      const newBody = body.substring(0, start) + '**' + selected + '**' + body.substring(end);
      updateBlock(index, 'body', newBody);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, end + 4);
      }, 0);
    }
  };

  // ── カーソル位置のマーカーを解除 ────────────────────────────
  const removeMarkerAtCursor = (index: number) => {
    const textarea = bodyTextareaRefs.current[index];
    if (!textarea) return;

    const body = blocks[index].body;
    const cursor = textarea.selectionStart ?? 0;

    // カーソル前の最後の ** を探す
    const before = body.substring(0, cursor);
    const lastOpenIdx = before.lastIndexOf('**');
    if (lastOpenIdx === -1) {
      setMessage('⚠️ 解除できるマーカーが見つかりません（マーカー内にカーソルを置いてください）');
      setTimeout(() => setMessage(''), 2500);
      return;
    }

    const afterOpen = body.substring(lastOpenIdx + 2);
    const closeOffset = afterOpen.indexOf('**');
    if (closeOffset === -1) {
      setMessage('⚠️ マーカーの閉じタグが見つかりません');
      setTimeout(() => setMessage(''), 2500);
      return;
    }

    const closeIdx = lastOpenIdx + 2 + closeOffset;

    // カーソルがマーカーの範囲内かチェック
    if (cursor < lastOpenIdx || cursor > closeIdx + 2) {
      setMessage('⚠️ マーカー内にカーソルを置いてから解除ボタンを押してください');
      setTimeout(() => setMessage(''), 2500);
      return;
    }

    const inner = body.substring(lastOpenIdx + 2, closeIdx);
    const newBody = body.substring(0, lastOpenIdx) + inner + body.substring(closeIdx + 2);
    updateBlock(index, 'body', newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lastOpenIdx, lastOpenIdx + inner.length);
    }, 0);
  };

  const handleHeroImageUpload = async (file: File) => {
    setHeroUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `hero_${projectId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('project-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setMessage(`ヒーロー画像アップロード失敗: ${uploadError.message}`);
      setHeroUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    setProject(prev => prev ? { ...prev, image_url: urlData.publicUrl } : prev);
    setMessage('ヒーロー画像をアップロードしました ✅');
    setHeroUploading(false);
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
        youtube_url: project.youtube_url,
        status: project.status,
        tiers: tiers,
        story: JSON.stringify(blocks),
        image_url: project.image_url ?? null,
        deadline:
          project.deadline && /^\d{4}-\d{2}-\d{2}$/.test(project.deadline)
            ? project.deadline
            : null,
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

  const totalAmount = supporters.reduce((sum, s) => sum + resolveAmount(s), 0);

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
          background: message.includes('失敗') || message.includes('⚠️') ? '#fef2f2' : '#f0fdf4',
          color: message.includes('失敗') || message.includes('⚠️') ? '#ef4444' : '#16a34a',
          border: `1px solid ${message.includes('失敗') || message.includes('⚠️') ? '#fecaca' : '#bbf7d0'}`,
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
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>目標金額（円）</label>
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
              value={project.status ?? '募集中'}
              onChange={e => setProject(prev => prev ? { ...prev, status: e.target.value } : prev)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }}
            >
              <option value="準備中">準備中</option>
              <option value="募集中">募集中</option>
              <option value="終了">終了</option>
              <option value="closed">closed（完全終了）</option>
            </select>
          </div>
        </div>
      </section>

      {/* ヒーロー画像 */}
      <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '2px solid #bfdbfe' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#1e3a5f' }}>
          🖼️ トップ画像（ヒーロー画像）
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          プロジェクト詳細ページの一番上に表示される横断幕のような画像です。
        </p>
        {project.image_url ? (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>現在の画像：</p>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/5', overflow: 'hidden', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <img
                src={project.image_url}
                alt="ヒーロー画像"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setProject(prev => prev ? { ...prev, image_url: null } : prev)}
              style={{ marginTop: '8px', padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}
            >
              🗑️ 画像を削除
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '16px', padding: '20px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            画像が設定されていません
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={heroPhotoRef}
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleHeroImageUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => heroPhotoRef.current?.click()}
          disabled={heroUploading}
          style={{ width: '100%', padding: '12px', background: heroUploading ? '#e2e8f0' : 'white', border: '2px dashed #60a5fa', borderRadius: '8px', cursor: heroUploading ? 'not-allowed' : 'pointer', fontSize: '15px', color: heroUploading ? '#94a3b8' : '#2563eb', fontWeight: 'bold', marginBottom: '12px' }}
        >
          {heroUploading ? '⏳ アップロード中...' : '📁 新しい画像をアップロード'}
        </button>
        <div>
          <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>または画像URLを直接入力</label>
          <input
            type="text"
            value={project.image_url ?? ''}
            onChange={e => setProject(prev => prev ? { ...prev, image_url: e.target.value || null } : prev)}
            placeholder="https://..."
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', color: '#334155' }}
          />
        </div>
      </section>

      {/* ティア編集 */}
      <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#1e3a5f' }}>
          🎁 支援プラン（ティア）編集
        </h2>
        {tiers.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>ティアが登録されていません</p>
        ) : (
          tiers.map((tier, i) => (
            <div key={tier.id ?? i} style={{ background: 'white', borderRadius: '10px', padding: '20px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>{tier.name}</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>プラン名</label>
                  <input type="text" value={tier.name ?? ''} onChange={e => updateTier(i, 'name', e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>金額（円）</label>
                  <input type="number" value={tier.amount ?? 0} onChange={e => updateTier(i, 'amount', Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>返礼品の説明</label>
                  <textarea value={tier.description ?? ''} onChange={e => updateTier(i, 'description', e.target.value)} rows={3} placeholder="返礼品の内容や支援プランの説明を入力してください..." style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical' }} />
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 支援者一覧 */}
      <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '2px solid #d1fae5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a5f', margin: 0 }}>
            👥 支援者一覧
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: '#64748b' }}>{supporters.length}名</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>
              合計 ¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
        {supporters.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f1f5f9', borderRadius: '8px' }}>
            まだ支援者がいません
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {supporters.map(supporter => {
              const displayAmount = resolveAmount(supporter);
              return (
                <div
                  key={supporter.id}
                  style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                        {supporter.name || '（名前なし）'}
                      </span>
                      {supporter.tier_name && (
                        <span style={{ fontSize: '12px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', padding: '2px 8px', border: '1px solid #bfdbfe' }}>
                          {supporter.tier_name}
                        </span>
                      )}
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#16a34a' }}>
                        ¥{displayAmount.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {supporter.email && (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>📧 {supporter.email}</span>
                      )}
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        🕐 {new Date(supporter.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupporter(supporter.id)}
                    disabled={deletingId === supporter.id}
                    style={{ padding: '8px 14px', background: deletingId === supporter.id ? '#f1f5f9' : '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: deletingId === supporter.id ? '#94a3b8' : '#ef4444', fontSize: '13px', cursor: deletingId === supporter.id ? 'not-allowed' : 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {deletingId === supporter.id ? '削除中...' : '🗑️ 削除'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ストーリーブロック ── マーカー機能付き */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#1e3a5f' }}>
          📖 ストーリー（5章）
        </h2>

        {/* マーカー使い方ガイド */}
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#92400e',
          lineHeight: '1.7',
        }}>
          <strong>🖊️ マーカー機能の使い方</strong><br />
          ① 本文テキストエリアでハイライトしたい文字を<strong>ドラッグして選択</strong><br />
          ② 上の <strong style={{ background: '#fef08a', padding: '1px 6px', borderRadius: '3px' }}>🖊️ マーカー</strong> ボタンをクリック → <code>**テキスト**</code> に変換されます<br />
          ③ 解除したい場合はマーカー内にカーソルを置いて <strong>✕ 解除</strong> をクリック<br />
          ④ 下のプレビューで黄色ハイライト表示を確認できます
        </div>

        {blocks.map((block, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: '12px', padding: '24px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', flexShrink: 0 }}>
                {i + 1}
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {CHAPTER_TITLES[i]}
              </h3>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* 見出し */}
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

              {/* 本文 ── マーカーツールバー付き */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>本文</label>

                {/* ── マーカーツールバー ── */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                  padding: '8px 10px',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px 8px 0 0',
                  borderBottom: 'none',
                }}>
                  <button
                    type="button"
                    onMouseDown={e => {
                      // onMouseDown + preventDefault でtextareaのfocusを維持したまま実行
                      e.preventDefault();
                      applyMarker(i);
                    }}
                    style={{
                      padding: '5px 14px',
                      background: '#fef08a',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#78350f',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    🖊️ マーカー
                  </button>
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      removeMarkerAtCursor(i);
                    }}
                    style={{
                      padding: '5px 14px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ✕ 解除
                  </button>
                  <span style={{ fontSize: '12px', color: '#a16207', marginLeft: '4px' }}>
                    テキストを選択 → マーカーボタン
                  </span>
                </div>

                {/* 本文 textarea */}
                <textarea
                  ref={el => { bodyTextareaRefs.current[i] = el; }}
                  value={block.body}
                  onChange={e => updateBlock(i, 'body', e.target.value)}
                  rows={6}
                  placeholder="この章の内容を入力してください..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #fcd34d',
                    borderRadius: '0 0 8px 8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'monospace',
                    lineHeight: '1.7',
                  }}
                />

                {/* プレビュー（** が含まれる場合のみ表示） */}
                {block.body.includes('**') && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 14px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.8',
                  }}>
                    <div style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      📋 プレビュー
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                      {renderMarkedPreview(block.body)}
                    </div>
                  </div>
                )}
              </div>

              {/* 画像 */}
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
                  style={{ padding: '8px 16px', background: 'white', border: '2px dashed #94a3b8', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#64748b', width: '100%' }}
                >
                  📁 画像をアップロード
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
          style={{ padding: '16px 48px', background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(245,158,11,0.4)' }}
        >
          {saving ? '保存中...' : '💾 保存する'}
        </button>
      </div>
    </div>
  );
}
