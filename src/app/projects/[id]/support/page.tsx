'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  deadline: string | null;
}

type Step = 'form' | 'confirm' | 'done';

// ── ティア別プレミアムスタイル定義 ──────────────────────────────
const TIER_STYLES = [
  {
    // ブロンズ
    border:   '2px solid #cd7f32',
    bg:       'linear-gradient(135deg, #fdf3e7 0%, #f5deb3 100%)',
    selectedBg: 'linear-gradient(135deg, #f0c080 0%, #cd7f32 100%)',
    badge:    '#cd7f32',
    badgeBg:  '#fdf3e7',
    icon:     '🥉',
    glow:     '0 0 16px rgba(205,127,50,0.4)',
  },
  {
    // シルバー
    border:   '2px solid #9e9ea0',
    bg:       'linear-gradient(135deg, #f4f4f5 0%, #d4d4d8 100%)',
    selectedBg: 'linear-gradient(135deg, #e2e2e4 0%, #9e9ea0 100%)',
    badge:    '#71717a',
    badgeBg:  '#f4f4f5',
    icon:     '🥈',
    glow:     '0 0 16px rgba(158,158,160,0.4)',
  },
  {
    // ゴールド
    border:   '2px solid #f59e0b',
    bg:       'linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)',
    selectedBg: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
    badge:    '#d97706',
    badgeBg:  '#fffbeb',
    icon:     '🥇',
    glow:     '0 0 20px rgba(245,158,11,0.5)',
  },
  {
    // プラチナ
    border:   '2px solid #6366f1',
    bg:       'linear-gradient(135deg, #eef2ff 0%, #c7d2fe 100%)',
    selectedBg: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)',
    badge:    '#4f46e5',
    badgeBg:  '#eef2ff',
    icon:     '💎',
    glow:     '0 0 24px rgba(99,102,241,0.5)',
  },
  {
    // レジェンド
    border:   '2px solid transparent',
    bg:       'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    selectedBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    badge:    '#f093fb',
    badgeBg:  '#1a1a2e',
    icon:     '👑',
    glow:     '0 0 32px rgba(240,147,251,0.6), 0 0 64px rgba(102,126,234,0.3)',
  },
];

function getTierStyle(idx: number) {
  return TIER_STYLES[Math.min(idx, TIER_STYLES.length - 1)];
}

export default function SupportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [project,    setProject]    = useState<Project | null>(null);
  const [tiers,      setTiers]      = useState<Tier[]>([]);
  const [selTier,    setSelTier]    = useState<Tier | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [step,       setStep]       = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [qty,     setQty]     = useState(1);
  const [message, setMessage] = useState('');
  const [isAnon,  setIsAnon]  = useState(false);

  // ── 合計金額・自動ティア昇格（描画ごとに再計算）──────────────────
  const totalAmount = selTier ? selTier.amount * qty : 0;
  const effectiveTier: Tier | null = selTier && tiers.length > 0
    ? ([...tiers]
        .filter(t => totalAmount >= t.amount)
        .sort((a, b) => b.amount - a.amount)[0] ?? selTier)
    : selTier;
  const effectiveIdx = effectiveTier ? tiers.findIndex(t => t.id === effectiveTier.id) : 0;
  const effectiveStyle = getTierStyle(effectiveIdx);
  const upgraded = effectiveTier && selTier && effectiveTier.name !== selTier.name;

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: proj } = await supabase
        .from('crowdfunding_projects')
        .select('*')
        .eq('id', id)
        .single();

      if (!proj) { setLoading(false); return; }

      setProject({
        id:       proj.id,
        title:    proj.title    ?? '',
        school:   proj.school   ?? '',
        club:     proj.club     ?? '',
        region:   proj.region   ?? '',
        deadline: proj.deadline ?? null,
      });

      const raw = (proj as any)['tiers'] ?? [];
      const list: Tier[] = Array.isArray(raw)
        ? raw.map((t: any, i: number) => ({
            ...t,
            id: t.id != null ? String(t.id) : String(i),
          }))
        : [];
      setTiers(list);

      const tierParam = searchParams.get('tier');
      if (tierParam && list.length > 0) {
        const found = list.find((t) => String(t.id) === tierParam);
        if (found) { setSelTier(found); }
        else {
          const idx = parseInt(tierParam, 10);
          setSelTier(!isNaN(idx) && list[idx] ? list[idx] : list[0]);
        }
      } else if (list.length > 0) {
        setSelTier(list[0]);
      }

      setLoading(false);
    })();
  }, [id, searchParams]);

  async function handleSubmit() {
    if (!selTier || !project || !effectiveTier) return;
    setSubmitting(true);
    setError('');

    const transferCode = 'SP-' + Math.random().toString(36).slice(2, 8).toUpperCase();

    const { error: insertErr } = await supabase
      .from('supporters')
      .insert([{
        project_id:    Number(id),
        project_title: project.title,
        name:          isAnon ? '匿名' : name,
        email:         email,
        tier:          effectiveTier.name,
        units:         qty,
        total_amount:  totalAmount,
        transfer_code: transferCode,
        status:        'pending',
        message:       message,
      }]);

    if (insertErr) {
      setError('送信に失敗しました: ' + insertErr.message);
      setSubmitting(false);
      return;
    }

    setStep('done');
    setSubmitting(false);
  }

  // ── ローディング画面 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}>
        <div style={{ fontSize: 72, animation: 'bounce 0.8s infinite alternate' }}>🏸</div>
        <div style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 900,
          fontSize: 32,
          letterSpacing: '0.15em',
          background: 'linear-gradient(90deg, #f093fb, #f5a623, #38ef7d)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>ならバド</div>
        <p style={{ color: '#94a3b8', fontSize: 14, letterSpacing: '0.1em' }}>読み込み中...</p>
        <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-20px); } }`}</style>
      </div>
    );
  }

  // ── 完了画面 ────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 32,
      }}>
        <div style={{ fontSize: 80 }}>🎉</div>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, textAlign: 'center', margin: 0 }}>
          ご支援ありがとうございます！
        </h1>
        <p style={{ color: '#94a3b8', textAlign: 'center', lineHeight: 1.8, margin: 0 }}>
          {project?.club ?? ''} への支援が完了しました。<br />
          振込情報はメールにてお送りします。
        </p>
        <button
          onClick={() => router.push(`/projects/${id}`)}
          style={{
            padding: '14px 36px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
          }}
        >
          プロジェクトページへ戻る
        </button>
      </div>
    );
  }

  // ── 確認画面 ────────────────────────────────────────────────────
  if (step === 'confirm') {
    const isLegend = effectiveIdx >= 4;
    return (
      <div style={{
        minHeight: '100vh',
        background: isLegend
          ? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)'
          : 'linear-gradient(135deg, #f0f4ff, #faf7ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          background: isLegend ? 'rgba(255,255,255,0.05)' : '#fff',
          borderRadius: 24,
          boxShadow: effectiveStyle.glow + ', 0 8px 40px rgba(0,0,0,0.12)',
          padding: '40px 32px',
          maxWidth: 480,
          width: '100%',
          border: effectiveStyle.border,
        }}>
          {/* ヘッダー */}
          <div style={{
            background: effectiveStyle.selectedBg,
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 28,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{effectiveStyle.icon}</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: isLegend ? '#fff' : '#1e293b' }}>
              支援内容の確認
            </h1>
            {upgraded && (
              <div style={{
                marginTop: 10,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '4px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: isLegend ? '#f0f0ff' : '#1e1e3f',
                display: 'inline-block',
              }}>
                🎉 {selTier?.name} → {effectiveTier?.name} に自動昇格！
              </div>
            )}
          </div>

          {/* 内容テーブル */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 24 }}>
            <tbody>
              {[
                ['プロジェクト', project?.club],
                ['お名前',      isAnon ? '匿名' : name],
                ['メール',      email],
                ['ティア',      effectiveTier?.name + ' ' + effectiveStyle.icon],
                ['口数',        qty + ' 口'],
                ['合計金額',    '¥' + totalAmount.toLocaleString()],
              ].map(([label, val], i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={{ padding: '10px 0', color: isLegend ? '#94a3b8' : '#64748b', width: '40%' }}>{label}</td>
                  <td style={{
                    padding: '10px 0',
                    fontWeight: label === '合計金額' ? 800 : 600,
                    fontSize: label === '合計金額' ? 20 : 14,
                    color: label === '合計金額'
                      ? (isLegend ? '#f093fb' : '#6366f1')
                      : (isLegend ? '#e2e8f0' : '#1e293b'),
                  }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setStep('form')}
              style={{
                flex: 1,
                padding: '14px 0',
                background: 'transparent',
                border: '2px solid rgba(100,116,139,0.3)',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                color: isLegend ? '#94a3b8' : '#475569',
                cursor: 'pointer',
              }}
            >戻る</button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2,
                padding: '14px 0',
                background: submitting ? '#94a3b8' : effectiveStyle.selectedBg,
                border: 'none',
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : effectiveStyle.glow,
              }}
            >{submitting ? '送信中...' : '支援を確定する'}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── フォーム画面 ────────────────────────────────────────────────
  const selIdx = selTier ? tiers.findIndex(t => t.id === selTier.id) : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f0f4ff 0%, #faf7ff 50%, #f0fdf4 100%)',
      paddingBottom: 60,
    }}>
      {/* ── ナビバー ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'transparent',
            border: '2px solid #e2e8f0',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
          }}
        >← 戻る</button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>
          🏸 支援する
        </span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 16px' }}>
        {/* プロジェクト名 */}
        {project && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', margin: '0 0 6px' }}>
              {project.club}
            </h1>
            <p style={{ color: '#64748b', margin: 0 }}>{project.school}</p>
          </div>
        )}

        {/* ── ティア選択 ── */}
        {tiers.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#374151', marginBottom: 14 }}>
              💎 支援ティアを選ぶ
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tiers.map((t, idx) => {
                const s = getTierStyle(idx);
                const isSel = selTier?.id === t.id;
                const isLeg = idx >= 4;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelTier(t); setQty(1); }}
                    style={{
                      textAlign: 'left',
                      border: isSel ? '2.5px solid transparent' : s.border,
                      borderRadius: 18,
                      padding: '18px 20px',
                      background: isSel ? s.selectedBg : s.bg,
                      boxShadow: isSel ? s.glow + ', 0 4px 20px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      transform: isSel ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{s.icon}</span>
                        <span style={{
                          fontWeight: 800,
                          fontSize: 16,
                          color: isSel && isLeg ? '#fff' : (isSel ? '#1e1e3f' : (isLeg ? '#e2e8f0' : '#1e293b')),
                        }}>{t.name}</span>
                      </div>
                      <span style={{
                        fontWeight: 900,
                        fontSize: 18,
                        color: isSel && isLeg ? '#f093fb' : (isSel ? '#fff' : s.badge),
                        background: isSel ? 'rgba(255,255,255,0.2)' : s.badgeBg,
                        padding: '4px 12px',
                        borderRadius: 999,
                      }}>¥{Number(t.amount).toLocaleString()}</span>
                    </div>
                    {t.description && (
                      <p style={{
                        margin: '8px 0 0 32px',
                        fontSize: 13,
                        color: isSel && isLeg ? 'rgba(255,255,255,0.7)' : (isSel ? 'rgba(30,30,63,0.7)' : '#64748b'),
                      }}>{t.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 支援者情報 ── */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '28px 24px',
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#374151', marginBottom: 20, margin: '0 0 20px' }}>
            👤 支援者情報
          </h2>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#475569', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={isAnon} onChange={(e) => setIsAnon(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
            匿名で支援する
          </label>

          {!isAnon && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
                お名前 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                placeholder="山田 太郎"
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
              メールアドレス <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              placeholder="example@email.com"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10 }}>口数</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', fontWeight: 700 }}
              >－</button>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', minWidth: 32, textAlign: 'center' }}>{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid #e2e8f0', background: '#f8fafc', fontSize: 20, cursor: 'pointer', fontWeight: 700 }}
              >＋</button>
            </div>
          </div>

          {/* 自動昇格バナー */}
          {upgraded && effectiveTier && (
            <div style={{
              margin: '0 0 16px',
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              border: '2px solid #f59e0b',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 24 }}>🎉</span>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#92400e' }}>
                  ティア自動昇格！
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#b45309' }}>
                  ¥{totalAmount.toLocaleString()} の支援で
                  <strong> {selTier?.name} → {effectiveTier.name} {getTierStyle(effectiveIdx).icon}</strong> に昇格します
                </p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6 }}>
              応援メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 15, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="チームへのメッセージをどうぞ"
            />
          </div>

          {/* 合計金額 */}
          <div style={{
            background: getTierStyle(selIdx).bg,
            border: getTierStyle(selIdx).border,
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>合計金額</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: getTierStyle(selIdx).badge }}>
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button
            onClick={() => {
              if (!isAnon && !name.trim()) { setError('お名前を入力してください'); return; }
              if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
              if (!selTier) { setError('ティアを選択してください'); return; }
              setError('');
              setStep('confirm');
            }}
            style={{
              width: '100%',
              padding: '16px 0',
              background: effectiveStyle.selectedBg,
              border: 'none',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              cursor: 'pointer',
              boxShadow: effectiveStyle.glow,
              letterSpacing: '0.05em',
            }}
          >
            確認画面へ →
          </button>
        </div>
      </div>
    </div>
  );
}
