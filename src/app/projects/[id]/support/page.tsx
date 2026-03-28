'use client';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Tier { id: string; name: string; amount: number; description: string; limit?: number; remaining?: number; }
interface Project { id: string; title: string; school: string; club: string; region: string; deadline: string; }
type Step = 'form' | 'confirm' | 'done';

const TIER_STYLES = [
  {
    name: 'ブロンズ', icon: '🥉', glow: '#CD7F32',
    grad: 'linear-gradient(135deg,#8B4513,#CD7F32,#F4A460)',
    selGrad: 'linear-gradient(135deg,#A0522D,#D4935A,#F5C08A)',
    pageBg: 'linear-gradient(135deg,#FFE4C4 0%,#FFDAB9 40%,#FFB87A 70%,#FFE4C4 100%)',
    rankMsg: 'よくぞ踏み出した！応援の第一歩。',
    starCount: 0,
    fw: { colors: ['#CD7F32','#FFA55E','#FFE0CC'], count: 30, launches: 1 }
  },
  {
    name: 'シルバー', icon: '🥈', glow: '#909090',
    grad: 'linear-gradient(135deg,#666666,#A0A0A0,#D8D8D8)',
    selGrad: 'linear-gradient(135deg,#777,#B0B0B0,#E8E8E8)',
    pageBg: 'linear-gradient(135deg,#E8E8F0 0%,#D8D8E8 40%,#C8C8DC 70%,#E0E0EE 100%)',
    rankMsg: '輝く銀の翼！あなたの支援が光る。',
    starCount: 5,
    fw: { colors: ['#C0C0C0','#E8E8E8','#FFFFFF','#A8A8A8'], count: 50, launches: 3 }
  },
  {
    name: 'ゴールド', icon: '🏆', glow: '#DAA520',
    grad: 'linear-gradient(135deg,#B8860B,#DAA520,#FFD700)',
    selGrad: 'linear-gradient(135deg,#C8960B,#F0B830,#FFEC8B)',
    pageBg: 'linear-gradient(135deg,#FFF0A0 0%,#FFE066 30%,#FFD700 60%,#FFE880 80%,#FFF5B0 100%)',
    rankMsg: '黄金の輝き！あなたは真のサポーター。',
    starCount: 10,
    fw: { colors: ['#FFD700','#FFA500','#FFEC8B','#FF8C00','#FFFACD'], count: 80, launches: 6 }
  },
  {
    name: 'プラチナ', icon: '💎', glow: '#38BDF8',
    grad: 'linear-gradient(135deg,#2980b9,#5dade2,#aed6f1)',
    selGrad: 'linear-gradient(135deg,#2471a3,#6ab0d4,#c0dff0)',
    pageBg: 'linear-gradient(135deg,#B8E8FF 0%,#90D8FF 30%,#60C8FF 60%,#A0E0FF 80%,#C8F0FF 100%)',
    rankMsg: '煌めく白金！あなたは選ばれし支援者。',
    starCount: 18,
    fw: { colors: ['#E5E4E2','#BCC6CC','#FFFFFF','#ADD8E6','#87CEEB','#B0E0E6'], count: 130, launches: 10 }
  },
  {
    name: 'レジェンド', icon: '👑', glow: '#C084FC',
    grad: 'linear-gradient(135deg,#6B0080,#9B59B6,#FFD700)',
    selGrad: 'linear-gradient(135deg,#7B0090,#AB69C6,#FFE055)',
    pageBg: 'linear-gradient(135deg,#F0C8FF 0%,#E0A0FF 20%,#D080FF 40%,#FFE0A0 60%,#FFD0F0 80%,#F5C0FF 100%)',
    rankMsg: '🌟 あなたは伝説！永遠に称えられる英雄。',
    starCount: 35,
    fw: { colors: ['#FF0000','#FF7F00','#FFFF00','#00FF00','#00BFFF','#8B00FF','#FFD700','#FF69B4','#00FFFF'], count: 220, launches: 20 }
  },
];

const PARTICLE_CFG: Record<string, { chars: string[]; count: number }> = {
  'シルバー': { chars: ['✦','✧','⭐','·'], count: 5 },
  'ゴールド': { chars: ['✦','⭐','🌟','✨','💫'], count: 10 },
  'プラチナ': { chars: ['💎','✦','⭐','🌟','✨','❄️'], count: 18 },
  'レジェンド': { chars: ['👑','🌟','✨','💫','⭐','🔥','💥','🎇','🎆'], count: 35 },
};

function getTierStyle(name: string) { return TIER_STYLES.find(t => t.name === name) || TIER_STYLES[0]; }

function getTextColor(tierName: string): string {
  if (tierName === 'シルバー') return '#2a2a4a';
  if (tierName === 'ゴールド') return '#4a2e00';
  if (tierName === 'プラチナ') return '#0a2a4a';
  if (tierName === 'レジェンド') return '#3a0060';
  return '#4a1e00';
}

function getSubTextColor(tierName: string): string {
  if (tierName === 'シルバー') return '#4a4a6a';
  if (tierName === 'ゴールド') return '#6a4a10';
  if (tierName === 'プラチナ') return '#1a4a6a';
  if (tierName === 'レジェンド') return '#5a1a80';
  return '#6a3a10';
}

function BackgroundParticles({ tierName }: { tierName: string }) {
  const cfg = PARTICLE_CFG[tierName];
  const particles = useMemo(() => {
    if (!cfg) return [];
    return Array.from({ length: cfg.count }, (_, i) => ({
      id: i,
      char: cfg.chars[i % cfg.chars.length],
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 16 + Math.random() * 20,
    }));
  }, [tierName]);

  if (!cfg) return null;
  const isLegend = tierName === 'レジェンド';

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(110vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
        }
        @keyframes aurora {
          0%,100% { opacity: 0.3; transform: scaleX(1) scaleY(1); }
          50% { opacity: 0.5; transform: scaleX(1.1) scaleY(1.2); }
        }
      `}</style>
      {isLegend && (
        <>
          <div style={{ position: 'absolute', top: '10%', left: '-20%', width: '80%', height: '40%', background: 'radial-gradient(ellipse,rgba(192,132,252,0.35),transparent 70%)', animation: 'aurora 4s ease-in-out infinite', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '30%', right: '-20%', width: '70%', height: '35%', background: 'radial-gradient(ellipse,rgba(255,215,0,0.25),transparent 70%)', animation: 'aurora 5s ease-in-out infinite 1s', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '60%', height: '30%', background: 'radial-gradient(ellipse,rgba(255,100,220,0.25),transparent 70%)', animation: 'aurora 6s ease-in-out infinite 2s', borderRadius: '50%' }} />
        </>
      )}
      {particles.map(p => (
        <div key={p.id} style={{ position: 'absolute', bottom: 0, left: `${p.left}%`, fontSize: p.size, animation: `floatUp ${p.duration}s ${p.delay}s infinite linear`, willChange: 'transform,opacity' }}>
          {p.char}
        </div>
      ))}
    </div>
  );
}

function RankUpOverlay({ fromTier, toTier, onDone }: { fromTier: string; toTier: string; onDone: () => void }) {
  const style = getTierStyle(toTier);
  const tierIdx = TIER_STYLES.findIndex(t => t.name === toTier);
  const intensity = tierIdx + 1;
  const starCount = [0, 5, 12, 20, 35][tierIdx] ?? 35;

  useEffect(() => {
    const t = setTimeout(onDone, 1500 + intensity * 200);
    return () => clearTimeout(t);
  }, [onDone, intensity]);

  const stars = useMemo(() =>
    Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 10 + Math.random() * 20,
      delay: Math.random() * 0.8,
    })), [starCount]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <style>{`
        @keyframes rankFlash { 0%{opacity:0.7} 30%{opacity:0.3} 100%{opacity:0} }
        @keyframes rankCard { 0%{transform:scale(0.3) translateY(-60px);opacity:0} 40%{transform:scale(1.15) translateY(0);opacity:1} 70%{transform:scale(0.95)} 100%{transform:scale(1)} }
        @keyframes rankStar { 0%{transform:scale(0) rotate(0deg);opacity:0} 50%{transform:scale(1.5) rotate(180deg);opacity:1} 100%{transform:scale(1) rotate(360deg);opacity:0} }
        @keyframes rankPulse { 0%,100%{box-shadow:0 0 30px ${style.glow},0 0 60px ${style.glow}40} 50%{box-shadow:0 0 80px ${style.glow},0 0 120px ${style.glow}60} }
        @keyframes rankShine { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, background: style.glow, animation: 'rankFlash 0.8s ease-out forwards' }} />
      {stars.map(s => (
        <div key={s.id} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size, animation: `rankStar 1.2s ${s.delay}s ease-out forwards` }}>
          {style.icon}
        </div>
      ))}
      <div style={{
        position: 'relative',
        background: style.grad,
        border: `3px solid ${style.glow}`,
        borderRadius: 24,
        padding: '36px 52px',
        textAlign: 'center',
        animation: 'rankCard 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, rankPulse 0.8s 0.6s ease-in-out 2',
        boxShadow: `0 0 60px ${style.glow}, 0 0 120px ${style.glow}60`,
      }}>
        <div style={{ fontSize: 68, lineHeight: 1, marginBottom: 6, animation: 'rankShine 0.8s ease-in-out infinite' }}>{style.icon}</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, letterSpacing: 4, marginBottom: 4 }}>FROM {fromTier}</div>
        <div style={{ color: style.glow, fontSize: 34, fontWeight: 900, letterSpacing: 6, textShadow: `0 0 20px ${style.glow}, 0 0 40px ${style.glow}` }}>RANK UP!</div>
        <div style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, marginTop: 6 }}>{toTier} 達成！</div>
        <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 500, marginTop: 8, fontStyle: 'italic' }}>{style.rankMsg}</div>
      </div>
    </div>
  );
}

interface Particle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number; decay: number; }

function FireworksCanvas({ tierName, active, zIndex = 9999 }: { tierName: string; active: boolean; zIndex?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const launchCountRef = useRef(0);
  const style = getTierStyle(tierName);
  const fw = style.fw;

  const launchFirework = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const x = canvas.width * (0.2 + Math.random() * 0.6);
    const y = canvas.height * (0.1 + Math.random() * 0.5);
    for (let i = 0; i < fw.count; i++) {
      const angle = (Math.PI * 2 * i) / fw.count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: fw.colors[Math.floor(Math.random() * fw.colors.length)],
        size: 2 + Math.random() * 3,
        decay: 0.01 + Math.random() * 0.008,
      });
    }
  }, [fw]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    launchCountRef.current = 0;
    particlesRef.current = [];
    launchFirework();
    launchCountRef.current = 1;

    const launchInterval = setInterval(() => {
      if (launchCountRef.current >= fw.launches) { clearInterval(launchInterval); return; }
      launchFirework();
      launchCountRef.current++;
    }, 600);

    const animate = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.02);
      for (const p of particlesRef.current) {
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.98; p.alpha -= p.decay; p.size *= 0.99;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { clearInterval(launchInterval); cancelAnimationFrame(animFrameRef.current); };
  }, [active, launchFirework, fw.launches]);

  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex }} />;
}

export default function SupportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selTier, setSelTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [error, setError] = useState('');
  const [showFireworks, setShowFireworks] = useState(false);
  const [rankUp, setRankUp] = useState<{ from: string; to: string } | null>(null);
  const prevEffTierRef = useRef<string>('');
  const [bgTierName, setBgTierName] = useState<string>('ブロンズ');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('crowdfunding_projects')
        .select('id,title,school,club,region,deadline,tiers')
        .eq('id', id)
        .single();
      if (err || !data) { setLoading(false); return; }
      setProject({ id: data.id, title: data.title ?? '', school: data.school ?? '', club: data.club ?? '', region: data.region ?? '', deadline: data.deadline ?? '' });
      let parsed: Tier[] = [];
      try { const raw = typeof data.tiers === 'string' ? JSON.parse(data.tiers) : data.tiers; if (Array.isArray(raw)) parsed = raw; } catch { parsed = []; }
      setTiers(parsed);
      const tierParam = searchParams.get('tier');
      const idx = tierParam !== null ? parseInt(tierParam) : 0;
      const initial = parsed[idx] ?? parsed[0];
      if (initial) { setSelTier(initial); setBgTierName(initial.name); }
      setLoading(false);
    })();
  }, [id, searchParams]);

  const totalAmount = (selTier?.amount ?? 0) * qty;
  const effectiveTier = [...tiers].filter(t => totalAmount >= t.amount).sort((a, b) => b.amount - a.amount)[0] ?? selTier;
  const upgraded = effectiveTier && selTier && effectiveTier.name !== selTier.name;
  const effStyle = getTierStyle(effectiveTier?.name ?? 'ブロンズ');
  const selStyle = getTierStyle(bgTierName);
  const textColor = getTextColor(bgTierName);
  const subTextColor = getSubTextColor(bgTierName);

  useEffect(() => {
    const currentName = effectiveTier?.name ?? '';
    if (!currentName) return;
    if (prevEffTierRef.current && prevEffTierRef.current !== currentName) {
      const prevIdx = TIER_STYLES.findIndex(t => t.name === prevEffTierRef.current);
      const newIdx = TIER_STYLES.findIndex(t => t.name === currentName);
      if (newIdx > prevIdx) {
        setBgTierName(currentName);
        setRankUp({ from: prevEffTierRef.current, to: currentName });
      }
    }
    prevEffTierRef.current = currentName;
  }, [effectiveTier?.name]);

  const handleTierSelect = (tier: Tier) => {
    setSelTier(tier);
    setBgTierName(tier.name);
    setQty(1);
  };

  // ━━ handleSubmit: /api/send-email 経由でDB保存＋メール送信 ━━
  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    console.log('DEBUG isAnon:', isAnon, 'name:', name);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supporterName: name,
          isAnonymous: isAnon,
          supporterEmail: email,
          tier: effectiveTier?.name ?? selTier?.name ?? '',
          units: qty,
          totalAmount,
          message: message || '',
          projectTitle: project?.title ?? '',
          projectId: id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(`エラー: ${data.error ?? 'サーバーエラー'}`);
        setSubmitting(false);
        return;
      }
      setShowFireworks(true);
      const dur = (getTierStyle(effectiveTier?.name ?? 'ブロンズ').fw.launches * 600) + 4000;
      setTimeout(() => setShowFireworks(false), dur);
      setStep('done');
    } catch {
      setError('通信エラーが発生しました');
    }
    setSubmitting(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#FFE4C4,#FFDAB9,#FFB87A)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <img src="/narabado-logo.png" alt="logo" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ fontSize: 14, color: '#CD7F32', fontWeight: 600, letterSpacing: 2 }}>読み込み中...</div>
      </div>
    </div>
  );

  if (step === 'done') return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100 }} />
      <FireworksCanvas tierName={effectiveTier?.name ?? 'ブロンズ'} active={showFireworks} zIndex={101} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 102, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: `2px solid ${effStyle.glow}`, borderRadius: 24, padding: '28px 20px', textAlign: 'center', maxWidth: 480, width: '100%', boxShadow: `0 20px 80px rgba(0,0,0,0.6), 0 0 40px ${effStyle.glow}40` }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>{effStyle.icon}</div>
          <h1 style={{ color: effStyle.glow, fontSize: 24, fontWeight: 800, marginBottom: 8, wordBreak: 'break-word' }}>ありがとうございます！</h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginBottom: 4 }}>{project?.title ?? ''} への支援が完了しました</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>{project?.school} {project?.club}</p>
          <div style={{ margin: '24px 0', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>支援ティア</div>
            <div style={{ color: effStyle.glow, fontSize: 22, fontWeight: 700 }}>{effStyle.icon} {effectiveTier?.name}</div>
            <div style={{ color: '#FFD700', fontSize: 32, fontWeight: 800, marginTop: 8 }}>¥{totalAmount.toLocaleString()}</div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 28 }}>振込コードをメールでご確認ください</p>
          <button onClick={() => router.push(`/projects/${id}`)} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: 12, padding: '14px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', boxShadow: '0 4px 20px rgba(102,126,234,0.4)' }}>
            プロジェクトページへ戻る
          </button>
        </div>
      </div>
    </>
  );

  if (step === 'confirm') return (
    <div style={{ minHeight: '100vh', background: effStyle.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, transition: 'background 0.8s ease' }}>
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', border: `2px solid ${effStyle.glow}`, borderRadius: 24, padding: '40px 32px', maxWidth: 480, width: '100%', boxShadow: `0 8px 40px ${effStyle.glow}40` }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, filter: `drop-shadow(0 4px 12px ${effStyle.glow}80)` }}>{effStyle.icon}</div>
          <h2 style={{ color: textColor, fontSize: 22, fontWeight: 800, marginTop: 8 }}>支援内容の確認</h2>
        </div>
        {[
          ['プロジェクト', project?.title ?? ''],
          ['支援者名', isAnon ? '匿名' : name],
          ['メールアドレス', email],
          ['ティア', `${effStyle.icon} ${effectiveTier?.name}`],
          ['口数', `${qty}口`],
          ['合計金額', `¥${totalAmount.toLocaleString()}`],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${effStyle.glow}30` }}>
            <span style={{ color: subTextColor, fontSize: 13 }}>{label}</span>
            <span style={{ color: textColor, fontWeight: 600, fontSize: 14 }}>{val}</span>
          </div>
        ))}
        {upgraded && (
          <div style={{ margin: '16px 0', background: `${effStyle.glow}20`, border: `1px solid ${effStyle.glow}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center', color: effStyle.glow, fontSize: 13, fontWeight: 600 }}>
            ✨ ティアが {selTier?.name} → {effectiveTier?.name} にアップグレードされました！
          </div>
        )}
        {error && <div style={{ background: '#ff000015', border: '1px solid #ff4444', borderRadius: 10, padding: 12, color: '#cc0000', fontSize: 13, marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button onClick={() => setStep('form')} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: textColor, border: `1px solid ${effStyle.glow}60`, borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>戻る</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, background: effStyle.grad, color: 'white', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: `0 4px 20px ${effStyle.glow}50` }}>
            {submitting ? '送信中...' : `${effStyle.icon} 支援を確定する`}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: selStyle.pageBg, transition: 'background 0.9s ease', position: 'relative', paddingBottom: 60 }}>
      <BackgroundParticles tierName={bgTierName} />

      {rankUp && (
        <RankUpOverlay
          fromTier={rankUp.from}
          toTier={rankUp.to}
          onDone={() => setRankUp(null)}
        />
      )}

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', borderBottom: `2px solid ${selStyle.glow}80`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${selStyle.glow}`, borderRadius: 8, color: textColor, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>← 戻る</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: textColor, fontWeight: 700, fontSize: 15, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project?.title}</div>
          <div style={{ color: subTextColor, fontSize: 11 }}>{project?.school} / {project?.club}</div>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, filter: `drop-shadow(0 4px 16px ${selStyle.glow}90)` }}>{selStyle.icon}</div>
          <h1 style={{ color: textColor, fontSize: 26, fontWeight: 800, marginTop: 8, textShadow: `0 2px 8px ${selStyle.glow}50` }}>支援する</h1>
          <p style={{ color: subTextColor, fontSize: 13, marginTop: 4 }}>口数に応じてティアが自動アップグレードされます</p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ color: textColor, fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>ティアを選択</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tiers.map((tier) => {
              const ts = getTierStyle(tier.name);
              const isSelected = selTier?.name === tier.name;
              return (
                <button key={tier.id} onClick={() => handleTierSelect(tier)}
                  style={{ background: isSelected ? ts.selGrad : ts.grad, border: `2px solid ${isSelected ? ts.glow : 'transparent'}`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', boxShadow: isSelected ? `0 0 24px ${ts.glow}70, 0 4px 16px rgba(0,0,0,0.15)` : '0 2px 8px rgba(0,0,0,0.12)', transform: isSelected ? 'scale(1.02)' : 'scale(1)', display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  <div style={{ fontSize: 36, flexShrink: 0, filter: `drop-shadow(0 2px 8px ${ts.glow}90)` }}>{ts.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{tier.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 }}>{tier.description}</div>
                  </div>
                  <div style={{ color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0, textShadow: `0 0 12px ${ts.glow}` }}>¥{tier.amount.toLocaleString()}</div>
                </button>
              );
            })}
          </div>
        </div>

        {upgraded && (
          <div style={{ background: `linear-gradient(135deg,${effStyle.glow}50,${effStyle.glow}25)`, border: `2px solid ${effStyle.glow}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'center', color: textColor, fontWeight: 700, fontSize: 14, boxShadow: `0 4px 16px ${effStyle.glow}40` }}>
            ✨ {selTier?.name} → {effectiveTier?.name} 自動アップグレード中！
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '20px', marginBottom: 20, border: `1.5px solid ${selStyle.glow}60`, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ color: textColor, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>口数を選択</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.08)', border: `1.5px solid ${selStyle.glow}70`, color: textColor, fontSize: 20, cursor: 'pointer', fontWeight: 700 }}>−</button>
            <span style={{ color: textColor, fontSize: 28, fontWeight: 800, minWidth: 48, textAlign: 'center' }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)} style={{ width: 44, height: 44, borderRadius: '50%', background: selStyle.glow, border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', fontWeight: 700, boxShadow: `0 0 16px ${selStyle.glow}80` }}>＋</button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, color: effStyle.glow, fontWeight: 800, fontSize: 22, textShadow: `0 2px 8px ${effStyle.glow}50` }}>¥{totalAmount.toLocaleString()}</div>
          {upgraded && <div style={{ textAlign: 'center', fontSize: 12, color: effStyle.glow, marginTop: 4, fontWeight: 600 }}>{effStyle.icon} {effectiveTier?.name} ティア適用中</div>}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(8px)', borderRadius: 16, padding: '20px', marginBottom: 20, border: `1.5px solid ${selStyle.glow}60`, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ color: textColor, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>支援者情報</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} style={{ width: 18, height: 18, accentColor: selStyle.glow }} />
            <span style={{ color: textColor, fontSize: 14 }}>匿名で支援する</span>
          </label>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: subTextColor, fontSize: 12, display: 'block', marginBottom: 4 }}>お名前 *{isAnon && <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>（管理者のみ確認できます）</span>}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="山田 太郎" style={{ width: '100%', background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${selStyle.glow}70`, borderRadius: 8, padding: '10px 12px', color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {isAnon && <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>✓ 公開時は「匿名」と表示されます</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: subTextColor, fontSize: 12, display: 'block', marginBottom: 4 }}>メールアドレス *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${selStyle.glow}70`, borderRadius: 8, padding: '10px 12px', color: textColor, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: subTextColor, fontSize: 12, display: 'block', marginBottom: 4 }}>応援メッセージ（任意）</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="頑張ってください！" rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.85)', border: `1.5px solid ${selStyle.glow}70`, borderRadius: 8, padding: '10px 12px', color: textColor, fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <div style={{ background: '#ff000015', border: '1px solid #ff4444', borderRadius: 10, padding: 12, color: '#cc0000', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button
          onClick={() => {
            if (!name.trim()) { setError('お名前を入力してください'); return; }
            if (!email.trim()) { setError('メールアドレスを入力してください'); return; }
            setError(''); setStep('confirm');
          }}
          style={{ width: '100%', background: effStyle.grad, border: `2px solid ${effStyle.glow}`, borderRadius: 14, padding: '18px', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: `0 6px 30px ${effStyle.glow}60`, transition: 'all 0.3s', letterSpacing: 1 }}>
          {effStyle.icon} 確認画面へ進む
        </button>
      </div>
    </div>
  );
}
