'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  goal_amount: number;
  deadline: string | null;
  status: string;
}

type Step = 'form' | 'confirm' | 'done';

export default function SupportPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [project,  setProject]  = useState<Project | null>(null);
  const [tiers,    setTiers]    = useState<Tier[]>([]);
  const [selTier,  setSelTier]  = useState<Tier | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');

  // フォーム値
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [qty,      setQty]      = useState(1);
  const [message,  setMessage]  = useState('');
  const [isAnon,   setIsAnon]   = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: proj } = await supabase
        .from('crowdfunding_projects')
        .select('id,title,school,club,region,goal_amount,deadline,status,tiers')
        .eq('id', id)
        .single();
      if (proj) setProject(proj as unknown as Project);

      const { data: tierRows } = await supabase
        .from('project_tiers')
        .select('*')
        .eq('project_id', id)
        .order('amount', { ascending: true });

      let finalTierList = (tierRows ?? []) as unknown as Tier[];
      // project_tiers が空なら project.tiers JSON にフォールバック
      if (finalTierList.length === 0 && proj) {
        const jsonTiers = (proj as any).tiers;
        if (Array.isArray(jsonTiers)) {
          finalTierList = jsonTiers.map((t: any, i: number) => ({ ...t, id: t.id ?? String(i) }));
        }
      }
      setTiers(finalTierList);
      const tierIdParam = searchParams.get('tier');
      if (tierIdParam) {
        const found = finalTierList.find((t: any) => String(t.id) === tierIdParam);
        if (found) { setSelTier(found); }
        else {
          // インデックスフォールバック（tier=0,1,2 の場合）
          const idx = parseInt(tierIdParam, 10);
          if (!isNaN(idx) && finalTierList[idx]) setSelTier(finalTierList[idx]);
          else if (finalTierList.length > 0) setSelTier(finalTierList[0]);
        }
      } else if (finalTierList.length > 0) {
        setSelTier(finalTierList[0]);
      }
    setError('');
    return true;
  };

  const handleConfirm = () => {
    if (validate()) setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selTier || !project) return;
    setSubmitting(true);
    setError('');

    const { error: insErr } = await supabase
      .from('supporters')
      .insert({
        project_id:   Number(id),
        name:         isAnon ? '匿名' : name.trim(),
        email:        email.trim(),
        tier_id:      selTier.id,
        tier_name:    selTier.name,
        amount:       selTier.amount,
        quantity:     qty,
        total_amount: totalAmount,
        message:      message.trim() || null,
        status:       'pending',
      });

    setSubmitting(false);
    if (insErr) {
      setError('送信に失敗しました: ' + insErr.message);
      setStep('confirm');
      return;
    }
    setStep('done');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ color: '#1a2e4a', fontWeight: 700 }}>読み込み中…</p>
      </div>
    </div>
  );

  // ── 完了画面 ──
  if (step === 'done') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 500, width: '100%', background: '#fff', borderRadius: 20, padding: 40, boxShadow: '0 8px 40px rgba(0,0,0,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: '#166534', fontSize: 24, fontWeight: 900, marginBottom: 12 }}>支援申し込み完了！</h2>
        <p style={{ color: '#334155', fontSize: 15, lineHeight: 1.8, marginBottom: 8 }}>
          <strong>{isAnon ? '匿名' : name}</strong> 様、<br />
          ¥{totalAmount.toLocaleString()} のご支援ありがとうございます！
        </p>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          ご登録のメールアドレスに確認メールをお送りします。<br />
          管理者が承認後、支援者一覧に反映されます。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/projects/${id}`} style={{
            padding: '12px 28px', background: 'linear-gradient(135deg, #1a2e4a, #2563eb)',
            color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>← プロジェクトへ戻る</Link>
          <Link href="/" style={{
            padding: '12px 28px', background: '#f1f5f9', color: '#475569',
            borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>トップへ</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Noto Sans JP', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* ナビバー */}
      <nav style={{
        background: '#1a2e4a', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/logo.png" alt="CloudFan" style={{ height: 36 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>CloudFan</span>
        </Link>
        <Link href={`/projects/${id}`} style={{
          color: '#fff', padding: '8px 18px', fontSize: 14, textDecoration: 'none',
          border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8,
          fontWeight: 700, background: 'rgba(255,255,255,0.08)',
        }}>← プロジェクトへ戻る</Link>
      </nav>

      {/* パンくず */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#94a3b8' }}>
          <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>トップ</Link>
          <span>›</span>
          <Link href={`/projects/${id}`} style={{ color: '#94a3b8', textDecoration: 'none' }}>{project?.title || 'プロジェクト'}</Link>
          <span>›</span>
          <span style={{ color: '#1a2e4a', fontWeight: 700 }}>支援する</span>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* ステッパー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
          {(['form', 'confirm', 'done'] as Step[]).map((s, i) => {
            const labels = ['① 入力', '② 確認', '③ 完了'];
            const active = step === s;
            const past   = ['form', 'confirm', 'done'].indexOf(step) > i;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 800,
                  background: active ? 'linear-gradient(135deg, #1a2e4a, #2563eb)' : past ? '#059669' : '#e2e8f0',
                  color: active || past ? '#fff' : '#94a3b8',
                  boxShadow: active ? '0 3px 10px rgba(37,99,235,0.35)' : 'none',
                }}>{labels[i]}</div>
                {i < 2 && <div style={{ width: 40, height: 2, background: past ? '#059669' : '#e2e8f0' }} />}
              </div>
            );
          })}
        </div>

        {project && (
          <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, border: '1px solid #bfdbfe' }}>
            <p style={{ margin: 0, color: '#1e40af', fontWeight: 800, fontSize: 14 }}>📋 {project.title}</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14, fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1: 入力フォーム ── */}
        {step === 'form' && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>

            {/* 支援プラン選択 */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a2e4a', marginBottom: 12, fontSize: 15 }}>
                💎 支援プランを選択
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tiers.map(tier => {
                  const selected = selTier?.id === tier.id;
                  return (
                    <div key={tier.id} onClick={() => setSelTier(tier)} style={{
                      border: `2px solid ${selected ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                      background: selected ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#fff',
                      transition: 'all 0.15s',
                      boxShadow: selected ? '0 3px 12px rgba(37,99,235,0.15)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: selected ? '#1e40af' : '#1a2e4a', fontSize: 15 }}>
                          {selected ? '✅ ' : ''}{tier.name}
                        </span>
                        <span style={{ fontWeight: 900, color: '#2563eb', fontSize: 18 }}>¥{tier.amount.toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{tier.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 口数 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a2e4a', marginBottom: 10, fontSize: 15 }}>
                🔢 口数（何口支援しますか？）
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{
                  width: 40, height: 40, borderRadius: '50%', border: '2px solid #e2e8f0',
                  background: '#f8fafc', cursor: 'pointer', fontWeight: 900, fontSize: 20, color: '#1a2e4a',
                }}>−</button>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#1a2e4a', minWidth: 40, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{
                  width: 40, height: 40, borderRadius: '50%', border: '2px solid #2563eb',
                  background: '#2563eb', cursor: 'pointer', fontWeight: 900, fontSize: 20, color: '#fff',
                }}>＋</button>
                <span style={{ color: '#64748b', fontSize: 13 }}>口</span>
              </div>
              {selTier && (
                <div style={{ marginTop: 12, padding: '10px 16px', background: 'linear-gradient(135deg, #fef9c3, #fef3c7)', borderRadius: 10, border: '1px solid #fde68a', display: 'inline-block' }}>
                  <span style={{ color: '#92400e', fontWeight: 900, fontSize: 16 }}>合計: ¥{totalAmount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* お名前 */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a2e4a', marginBottom: 8, fontSize: 15 }}>
                👤 お名前 <span style={{ color: '#ef4444', fontSize: 12 }}>*必須</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="山田 太郎"
                disabled={isAnon}
                style={{
                  width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                  borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  background: isAnon ? '#f8fafc' : '#fff',
                  color: isAnon ? '#94a3b8' : '#0f172a',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: 13, color: '#64748b' }}>
                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
                匿名で支援する
              </label>
            </div>

            {/* メールアドレス */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a2e4a', marginBottom: 8, fontSize: 15 }}>
                ✉️ メールアドレス <span style={{ color: '#ef4444', fontSize: 12 }}>*必須</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                style={{
                  width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                  borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 応援メッセージ */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontWeight: 800, color: '#1a2e4a', marginBottom: 8, fontSize: 15 }}>
                💬 応援メッセージ <span style={{ color: '#94a3b8', fontSize: 12 }}>任意</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="チームへの応援メッセージをどうぞ！"
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0',
                  borderRadius: 10, fontSize: 14, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', lineHeight: 1.7, color: '#334155',
                }}
              />
            </div>

            <button onClick={handleConfirm} style={{
              width: '100%', padding: '16px 0',
              background: 'linear-gradient(135deg, #d4af37, #f5d060)',
              color: '#1a2e4a', border: 'none', borderRadius: 12,
              fontWeight: 900, fontSize: 18, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(212,175,55,0.45)',
              letterSpacing: '0.03em',
            }}>確認画面へ →</button>
          </div>
        )}

        {/* ── STEP 2: 確認画面 ── */}
        {step === 'confirm' && selTier && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ color: '#1a2e4a', fontWeight: 900, marginBottom: 24, fontSize: 18 }}>📋 申し込み内容の確認</h2>

            {[
              { label: '支援プラン', value: selTier.name },
              { label: '金額 / 口', value: `¥${selTier.amount.toLocaleString()}` },
              { label: '口数',       value: `${qty} 口` },
              { label: '合計金額',   value: `¥${totalAmount.toLocaleString()}`, bold: true, highlight: true },
              { label: 'お名前',     value: isAnon ? '匿名' : name },
              { label: 'メール',     value: email },
              ...(message ? [{ label: 'メッセージ', value: message }] : []),
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '14px 0', borderBottom: '1px solid #f1f5f9',
                background: (row as any).highlight ? 'linear-gradient(135deg, #fef9c3, #fef3c7)' : 'transparent',
                borderRadius: (row as any).highlight ? 8 : 0,
                paddingLeft: (row as any).highlight ? 12 : 0,
                paddingRight: (row as any).highlight ? 12 : 0,
              }}>
                <span style={{ color: '#64748b', fontSize: 14, fontWeight: 600, flexShrink: 0, marginRight: 16 }}>{row.label}</span>
                <span style={{ color: '#1a2e4a', fontSize: 14, fontWeight: (row as any).bold ? 900 : 700, textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 28, padding: '14px 18px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 28 }}>
              <p style={{ margin: 0, color: '#166534', fontSize: 13, lineHeight: 1.7 }}>
                ✅ 申し込み後、管理者が内容を確認してから承認されます。<br />
                承認後に支援者一覧へ掲載されます。
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep('form')} style={{
                flex: 1, padding: '14px 0', background: '#f1f5f9', color: '#475569',
                border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>← 修正する</button>
              <button onClick={handleSubmit} disabled={submitting} style={{
                flex: 2, padding: '14px 0',
                background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #1a2e4a, #2563eb)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontWeight: 900, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 6px 20px rgba(37,99,235,0.35)',
              }}>{submitting ? '送信中…' : '🎯 支援を申し込む'}</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
