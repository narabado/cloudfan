'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface StoryBlock { text: string; imageUrl: string; }

interface ProjectFormData {
  title: string;
  school: string;
  club: string;
  region: string;
  description: string;
  goal: number;
  deadline: string;
  status: string;
  youtube_url: string;
  storyBlocks: StoryBlock[];
}

const STATUS_OPTIONS = ['募集中', '終了', '準備中', '達成'];
const BLOCK_COLORS   = ['#e8f4fd', '#edfaf3', '#fdf8e8'];
const BLOCK_BORDERS  = ['#2563eb', '#059669', '#d97706'];
const BLOCK_TITLES   = ['第1ストーリーブロック', '第2ストーリーブロック', '第3ストーリーブロック'];

function safeDeadline(raw: unknown): string {
  if (!raw) return '';
  const s = String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

export default function ProjectEditForm({ projectId }: { projectId: number }) {
  const [form, setForm] = useState<ProjectFormData>({
    title: '', school: '', club: '', region: '', description: '',
    goal: 0, deadline: '', status: '募集中', youtube_url: '',
    storyBlocks: [
      { text: '', imageUrl: '' },
      { text: '', imageUrl: '' },
      { text: '', imageUrl: '' },
    ],
  });
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState('');

  const heroInputRef = useRef<HTMLInputElement>(null);
  const blockRef0    = useRef<HTMLInputElement>(null);
  const blockRef1    = useRef<HTMLInputElement>(null);
  const blockRef2    = useRef<HTMLInputElement>(null);
  const blockRefs    = [blockRef0, blockRef1, blockRef2] as const;

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (!data) return;

      const imgs: string[]  = Array.isArray(data.images) ? (data.images as string[]) : [];
      const hero            = imgs[0] || '';
      const storyImgs       = imgs.slice(1);
      const parts: string[] = (String(data.story || '')).split('---').map((s: string) => s.trim());

      setHeroImageUrl(hero);
      setForm({
        title:       String(data.title       || ''),
        school:      String(data.school      || ''),
        club:        String(data.club        || ''),
        region:      String(data.region      || ''),
        description: String(data.description || ''),
        goal:        Number(data.goal)        || 0,
        deadline:    safeDeadline(data.deadline),
        status:      String(data.status      || '募集中'),
        youtube_url: String(data.youtube_url || ''),
        storyBlocks: [0, 1, 2].map(i => ({
          text:     parts[i]     || '',
          imageUrl: storyImgs[i] || '',
        })),
      });
    })();
  }, [projectId]);

  const uploadHero = async (file: File) => {
    const path = `projects/${Date.now()}-hero-${file.name}`;
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
    if (error) { alert('アップロード失敗: ' + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    setHeroImageUrl(publicUrl);
  };

  const uploadBlock = async (file: File, index: number) => {
    const path = `projects/${Date.now()}-story${index}-${file.name}`;
    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
    if (error) { alert('アップロード失敗: ' + error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    updateBlock(index, 'imageUrl', publicUrl);
  };

  const updateBlock = (index: number, field: keyof StoryBlock, value: string) => {
    setForm(prev => {
      const blocks = [...prev.storyBlocks];
      blocks[index] = { ...blocks[index], [field]: value };
      return { ...prev, storyBlocks: blocks };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const story  = form.storyBlocks.map(b => b.text.trim()).filter(Boolean).join('\n---\n');
    const images = [heroImageUrl, ...form.storyBlocks.map(b => b.imageUrl)].filter(Boolean);

    const { error } = await supabase
      .from('crowdfunding_projects')
      .update({
        title:       form.title,
        school:      form.school,
        club:        form.club,
        region:      form.region,
        description: form.description,
        goal:        Number(form.goal),
        deadline:    form.deadline || null,
        status:      form.status,
        youtube_url: form.youtube_url || null,
        story,
        images,
      })
      .eq('id', projectId);

    setSaving(false);
    if (error) {
      setMessage('❌ 保存失敗: ' + error.message);
    } else {
      setMessage('✅ 保存しました！');
    }
  };

  const setStr = (key: keyof ProjectFormData, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));
  const setNum = (key: keyof ProjectFormData, val: number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const field: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 15,
    border: '1.5px solid #c8d6e5', borderRadius: 8,
    background: '#f8fbff', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: '#1a2e4a', display: 'block', marginBottom: 4,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>

      {/* ── ナビゲーションバー ── */}
      <nav style={{
        background: '#1a2e4a',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <Link href="/admin" style={{
          color: '#fff', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 700,
          padding: '8px 16px', borderRadius: 8,
          background: 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s',
        }}>
          ← 管理画面に戻る
        </Link>

        <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
          ✏️ プロジェクト編集
        </span>

        <Link href={`/projects/${projectId}`} style={{
          color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
          fontSize: 13, padding: '6px 14px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.3)',
        }}>
          👁 公開ページを見る
        </Link>
      </nav>

      {/* ── フォーム本体 ── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px' }}>

        {/* 基本情報 */}
        <section style={{
          marginBottom: 32, background: '#fff',
          borderRadius: 12, padding: 24,
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ color: '#2563eb', marginTop: 0 }}>📋 基本情報</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>プロジェクト名</label>
              <input style={field} value={form.title}
                onChange={e => setStr('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>学校名</label>
              <input style={field} value={form.school}
                onChange={e => setStr('school', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>クラブ名</label>
              <input style={field} value={form.club}
                onChange={e => setStr('club', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>地域</label>
              <input style={field} value={form.region}
                onChange={e => setStr('region', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>説明文</label>
            <textarea style={{ ...field, minHeight: 80 }} value={form.description}
              onChange={e => setStr('description', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>目標金額（円）</label>
              <input type="number" style={field} value={form.goal}
                onChange={e => setNum('goal', Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>締切日</label>
              <input type="date" style={field} value={form.deadline}
                onChange={e => setStr('deadline', e.target.value)} />
              {form.deadline && (
                <span style={{ fontSize: 12, color: '#059669', marginTop: 4, display: 'block' }}>
                  📅 {new Date(form.deadline + 'T00:00:00').toLocaleDateString('ja-JP')} まで
                </span>
              )}
            </div>
            <div>
              <label style={labelStyle}>ステータス</label>
              <select style={{ ...field, cursor: 'pointer' }} value={form.status}
                onChange={e => setStr('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span style={{
                display: 'inline-block', marginTop: 4, padding: '2px 10px',
                borderRadius: 12, fontSize: 12, fontWeight: 700,
                background: form.status === '募集中' ? '#dcfce7'
                          : form.status === '終了'   ? '#fee2e2' : '#fef9c3',
                color:      form.status === '募集中' ? '#166534'
                          : form.status === '終了'   ? '#991b1b' : '#854d0e',
              }}>
                現在: {form.status}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>YouTube URL（任意）</label>
            <input style={field} value={form.youtube_url}
              onChange={e => setStr('youtube_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..." />
          </div>
        </section>

        {/* ヒーロー画像 */}
        <section style={{
          marginBottom: 32, padding: 24, background: '#f0f4ff',
          borderRadius: 12, border: '2px dashed #2563eb',
        }}>
          <h3 style={{ color: '#1a2e4a', marginTop: 0 }}>🖼 メイン画像（ヒーロー）</h3>
          {heroImageUrl && (
            <img src={heroImageUrl} alt="hero"
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
          )}
          <input ref={heroInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) uploadHero(e.target.files[0]); }} />
          <button onClick={() => heroInputRef.current?.click()}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            📷 メイン画像を選択
          </button>
        </section>

        {/* ストーリーブロック × 3 */}
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ color: '#1a2e4a', marginBottom: 8 }}>📖 ストーリー（3ブロック）</h3>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
            ※ 各ブロックに<strong>文章と写真をセット</strong>で入力してください。
          </p>

          {form.storyBlocks.map((block, i) => (
            <div key={i} style={{
              marginBottom: 24, padding: 20,
              background: BLOCK_COLORS[i], borderRadius: 12,
              border: `2px solid ${BLOCK_BORDERS[i]}`,
            }}>
              <h4 style={{ margin: '0 0 14px', color: BLOCK_BORDERS[i], fontSize: 15 }}>
                {['①', '②', '③'][i]} {BLOCK_TITLES[i]}
              </h4>

              <div style={{ marginBottom: 12 }}>
                <label style={{ ...labelStyle, color: BLOCK_BORDERS[i] }}>📝 文章</label>
                <textarea style={{ ...field, minHeight: 120, borderColor: BLOCK_BORDERS[i] }}
                  value={block.text}
                  onChange={e => updateBlock(i, 'text', e.target.value)}
                  placeholder={`ブロック${i + 1}のストーリーを入力`} />
              </div>

              <div>
                <label style={{ ...labelStyle, color: BLOCK_BORDERS[i] }}>📸 写真（必須）</label>
                {block.imageUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <img src={block.imageUrl} alt={`block${i}`}
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: `2px solid ${BLOCK_BORDERS[i]}` }} />
                    <button onClick={() => updateBlock(i, 'imageUrl', '')}
                      style={{ marginTop: 4, padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                      🗑 削除
                    </button>
                  </div>
                )}
                <input ref={blockRefs[i]} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) uploadBlock(e.target.files[0], i); }} />
                <button onClick={() => blockRefs[i].current?.click()}
                  style={{
                    padding: '8px 20px',
                    background: block.imageUrl ? '#f1f5f9' : BLOCK_BORDERS[i],
                    color: block.imageUrl ? '#475569' : '#fff',
                    border: `2px solid ${BLOCK_BORDERS[i]}`,
                    borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}>
                  {block.imageUrl ? '🔄 写真を変更' : '📷 写真を選択'}
                </button>
                {block.text && !block.imageUrl && (
                  <span style={{ marginLeft: 12, color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
                    ⚠ 写真が未設定です
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* 保存ボタン */}
        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          {message && (
            <div style={{
              padding: '12px 24px', marginBottom: 16, borderRadius: 8,
              background: message.startsWith('✅') ? '#dcfce7' : '#fee2e2',
              color:      message.startsWith('✅') ? '#166534' : '#991b1b',
              fontWeight: 700,
            }}>
              {message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/admin" style={{
              padding: '14px 32px', background: '#f1f5f9', color: '#475569',
              border: '2px solid #e2e8f0', borderRadius: 10,
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              display: 'inline-block',
            }}>
              ← 管理画面に戻る
            </Link>
            <button onClick={handleSave} disabled={saving}
              style={{
                padding: '14px 48px',
                background: saving ? '#94a3b8' : '#1a2e4a',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 16, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}>
              {saving ? '保存中…' : '💾 保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
