"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";

const PROJECT_TITLE = "41年ぶりの全道優勝！北星学園女子バドミントン部を応援しよう";

const TIERS = [
  { id: 1, name: "ブロンズ",   amount: 1000,   color: "#cd7f32", icon: "🥉", desc: "お礼メール＋活動報告レポート送付" },
  { id: 2, name: "シルバー",   amount: 3000,   color: "#aaa",    icon: "🥈", desc: "＋オリジナルステッカー" },
  { id: 3, name: "ゴールド",   amount: 10000,  color: "#d4af37", icon: "🥇", desc: "＋直筆サイン色紙" },
  { id: 4, name: "プラチナ",   amount: 30000,  color: "#5be",    icon: "💎", desc: "＋練習見学招待＋記念写真撮影" },
  { id: 5, name: "レジェンド", amount: 100000, color: "#e55",    icon: "👑", desc: "＋ユニフォームに名前掲載" },
];

function getBestTier(total: number) {
  return [...TIERS].sort((a, b) => b.amount - a.amount).find(t => total >= t.amount) ?? TIERS[0];
}

type Step = "select" | "form" | "confirm" | "done";

function SupportPageInner() {
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.id as string;

  // tier パラメータはID(数字)または名前のどちらにも対応
  const tierParam = searchParams.get("tier") ?? "";
  const initTier =
    TIERS.find(t => String(t.id) === tierParam) ??
    TIERS.find(t => t.name === tierParam) ??
    TIERS[0];

  const [step,         setStep]         = useState<Step>("select");
  const [selectedTier, setSelectedTier] = useState(initTier);
  const [units,        setUnits]        = useState(1);
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [message,      setMessage]      = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");

  const totalAmount = selectedTier.amount * units;

  const handleUnitsChange = (newUnits: number) => {
    const clamped  = Math.max(1, Math.min(10, newUnits));
    const newTotal = selectedTier.amount * clamped;
    const best     = getBestTier(newTotal);
    if (best.name !== selectedTier.name) {
      setSelectedTier(best);
      setUnits(1);
    } else {
      setUnits(clamped);
    }
  };

  const handleTierSelect = (tier: typeof TIERS[0]) => {
    setSelectedTier(tier);
    setUnits(1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/send-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supporterName:  name.trim(),
          supporterEmail: email.trim(),
          tier:           selectedTier.name,
          units,
          totalAmount,
          message:        message.trim(),
          projectTitle:   PROJECT_TITLE,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.detail ?? data.error ?? "送信に失敗しました");
      }

      setTransferCode(data.transferCode ?? "");
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .support-nav {
          background: #0a1628; padding: 13px 20px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 3px solid #d4af37;
          position: sticky; top: 0; z-index: 100;
        }
        .form-input {
          width: 100%; padding: 12px 14px;
          border: 2px solid #e2e8f0; border-radius: 8px;
          font-size: 15px; outline: none; transition: border-color .2s;
          font-family: sans-serif;
        }
        .form-input:focus { border-color: #d4af37; }
        .form-label  { font-size: 14px; font-weight: bold; color: #0a1628; margin-bottom: 6px; display: block; }
        .form-group  { margin-bottom: 20px; }
        .tier-option {
          border: 2px solid #e2e8f0; border-radius: 10px; padding: 14px;
          cursor: pointer; transition: border-color .15s, background .15s;
          display: flex; align-items: center; gap: 12px;
        }
        .tier-option.selected { border-color: #d4af37; background: #fffbea; }
        .tier-option:hover    { border-color: #d4af37; }
        .step-indicator {
          display: flex; justify-content: center; gap: 8px;
          margin-bottom: 28px; flex-wrap: wrap;
        }
        .step-dot { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #aaa; }
        .step-dot.active { color: #d4af37; font-weight: bold; }
        .step-dot.done   { color: #22c55e; }
        .step-circle {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: bold; background: #e2e8f0; color: #aaa;
        }
        .step-dot.active .step-circle { background: #d4af37; color: #0a1628; }
        .step-dot.done   .step-circle { background: #22c55e; color: #fff; }
        .btn-gold {
          display: block; width: 100%;
          background: linear-gradient(135deg, #d4af37, #f0c040);
          color: #0a1628; border: none; border-radius: 10px;
          padding: 15px; font-size: 16px; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 12px rgba(212,175,55,.4);
          transition: transform .15s;
        }
        .btn-gold:hover    { transform: translateY(-2px); }
        .btn-gold:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .btn-back {
          display: block; width: 100%; background: transparent;
          color: #555; border: 2px solid #ddd; border-radius: 10px;
          padding: 12px; font-size: 15px; font-weight: bold;
          cursor: pointer; margin-bottom: 12px;
        }
        .confirm-row {
          display: flex; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;
        }
        .confirm-key { color: #888; }
        .confirm-val { font-weight: bold; color: #0a1628; text-align: right; max-width: 60%; }
        .upgrade-notice {
          background: #fffbea; border: 2px solid #d4af37; border-radius: 8px;
          padding: 10px 14px; margin-top: 8px; font-size: 13px; color: #856404;
          display: flex; align-items: center; gap: 8px;
        }
      `}</style>

      <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>
        <nav className="support-nav">
          <Link href="/" style={{ color: "#d4af37", fontWeight: "bold", fontSize: 15, textDecoration: "none" }}>
            🏸 BADMINTON SUPPORT HOKKAIDO
          </Link>
          <Link href={`/projects/${projectId}`} style={{ color: "#aaa", fontSize: 13, textDecoration: "none" }}>← プロジェクトへ</Link>
        </nav>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 16px" }}>
          <h1 style={{ textAlign: "center", color: "#0a1628", fontSize: "clamp(18px,4vw,24px)", marginBottom: 8 }}>
            🏸 支援申し込み
          </h1>
          <p style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            {PROJECT_TITLE}
          </p>

          {step !== "done" && (
            <div className="step-indicator">
              {(["select","form","confirm"] as Step[]).map((s, i) => {
                const labels = ["ティア選択","情報入力","確認"];
                const order  = ["select","form","confirm"];
                const cur    = order.indexOf(step);
                const isActive = s === step;
                const isDone   = order.indexOf(s) < cur;
                return (
                  <div key={s} className={`step-dot ${isActive?"active":""} ${isDone?"done":""}`}>
                    <div className="step-circle">{isDone ? "✓" : i+1}</div>
                    <span>{labels[i]}</span>
                    {i < 2 && <span style={{ color:"#ddd" }}>›</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 1 */}
          {step === "select" && (
            <div style={{ background:"#fff", borderRadius:14, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.08)" }}>
              <h2 style={{ color:"#0a1628", fontSize:17, marginBottom:16 }}>① 支援ティアを選択</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
                {TIERS.map(t => (
                  <div key={t.name} className={`tier-option ${selectedTier.name === t.name ? "selected" : ""}`}
                    onClick={() => handleTierSelect(t)}>
                    <span style={{ fontSize:24 }}>{t.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:"bold", color:t.color }}>{t.name}</div>
                      <div style={{ fontSize:12, color:"#666" }}>{t.desc}</div>
                    </div>
                    <div style={{ fontWeight:"bold", color:"#0a1628", whiteSpace:"nowrap" }}>
                      ¥{t.amount.toLocaleString()}/口
                    </div>
                    {selectedTier.name === t.name && <span style={{ color:"#d4af37", fontSize:18 }}>✓</span>}
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">
                  口数（1口 = ¥{selectedTier.amount.toLocaleString()}）
                  <span style={{ fontSize:12, color:"#888", fontWeight:"normal", marginLeft:8 }}>※複数口で自動ティアアップ</span>
                </label>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={() => handleUnitsChange(units-1)}
                    style={{ width:40, height:40, borderRadius:8, border:"2px solid #ddd", background:"#fff", fontSize:20, cursor:"pointer", fontWeight:"bold" }}>−</button>
                  <span style={{ fontSize:24, fontWeight:"bold", minWidth:40, textAlign:"center" }}>{units}</span>
                  <button onClick={() => handleUnitsChange(units+1)}
                    style={{ width:40, height:40, borderRadius:8, border:"2px solid #d4af37", background:"#fffbea", fontSize:20, cursor:"pointer", fontWeight:"bold", color:"#d4af37" }}>＋</button>
                  <span style={{ color:"#888", fontSize:13 }}>（最大10口）</span>
                </div>
                {(() => {
                  const nextIdx = TIERS.indexOf(selectedTier) + 1;
                  if (nextIdx < TIERS.length) {
                    const next = TIERS[nextIdx];
                    const need = Math.ceil(next.amount / selectedTier.amount);
                    if (need <= 10 && need > units) {
                      return (
                        <div className="upgrade-notice">
                          ⬆️ あと{need - units}口増やすと<strong>{next.icon} {next.name}</strong>に自動アップグレード！
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              <div style={{ background:"linear-gradient(135deg,#0a1628,#1a3060)", borderRadius:10, padding:"16px 20px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ color:"#aac", fontSize:14 }}>支援金額合計</span>
                  <span style={{ color:"#d4af37", fontWeight:"bold", fontSize:26 }}>¥{totalAmount.toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#aac", fontSize:12 }}>ティア</span>
                  <span style={{ color:"#fff", fontSize:14, fontWeight:"bold" }}>{selectedTier.icon} {selectedTier.name}</span>
                </div>
              </div>
              <button className="btn-gold" onClick={() => setStep("form")}>次へ：情報を入力する →</button>
            </div>
          )}

          {/* STEP 2 */}
          {step === "form" && (
            <div style={{ background:"#fff", borderRadius:14, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.08)" }}>
              <h2 style={{ color:"#0a1628", fontSize:17, marginBottom:20 }}>② 支援者情報を入力</h2>
              <div className="form-group">
                <label className="form-label">お名前 <span style={{ color:"#e55" }}>*</span></label>
                <input className="form-input" placeholder="山田 太郎" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">メールアドレス <span style={{ color:"#e55" }}>*</span></label>
                <input type="email" className="form-input" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">応援メッセージ（任意）</label>
                <textarea className="form-input" placeholder="選手への応援メッセージをどうぞ！"
                  rows={3} value={message} onChange={e => setMessage(e.target.value)} style={{ resize:"vertical" }} />
              </div>
              <div style={{ background:"#f5f7fa", borderRadius:8, padding:14, marginBottom:20, fontSize:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:"#888" }}>ティア</span>
                  <span style={{ fontWeight:"bold", color:selectedTier.color }}>{selectedTier.icon} {selectedTier.name}（{units}口）</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"#888" }}>支援金額</span>
                  <span style={{ fontWeight:"bold", color:"#d4af37", fontSize:18 }}>¥{totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <button className="btn-back" onClick={() => setStep("select")}>← 戻る</button>
              <button className="btn-gold" disabled={!name.trim() || !email.trim()} onClick={() => setStep("confirm")}>
                次へ：確認画面へ →
              </button>
            </div>
          )}

          {/* STEP 3 */}
          {step === "confirm" && (
            <div style={{ background:"#fff", borderRadius:14, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,.08)" }}>
              <h2 style={{ color:"#0a1628", fontSize:17, marginBottom:20 }}>③ 内容を確認</h2>
              {[
                ["お名前",         name],
                ["メールアドレス", email],
                ["支援ティア",     `${selectedTier.icon} ${selectedTier.name}`],
                ["口数",           `${units}口`],
                ["支援金額",       `¥${totalAmount.toLocaleString()}`],
                ["応援メッセージ", message || "（なし）"],
              ].map(([k, v]) => (
                <div key={k} className="confirm-row">
                  <span className="confirm-key">{k}</span>
                  <span className="confirm-val">{v}</span>
                </div>
              ))}
              <div style={{ background:"#fffbea", border:"2px solid #d4af37", borderRadius:10, padding:14, marginTop:20, marginBottom:20 }}>
                <p style={{ fontSize:13, color:"#856404", margin:0, lineHeight:1.8 }}>
                  ⚠️ 申し込み後、振込番号と振込先をメールでお送りします。<br />
                  <strong>7日以内</strong>に振込をお願いいたします。
                </p>
              </div>
              {error && (
                <div style={{ background:"#fef2f2", border:"1px solid #ef4444", borderRadius:8, padding:12, marginBottom:16, color:"#ef4444", fontSize:14, whiteSpace:"pre-wrap" }}>
                  {error}
                </div>
              )}
              <button className="btn-back" onClick={() => setStep("form")}>← 戻る</button>
              <button className="btn-gold" disabled={submitting} onClick={handleSubmit}>
                {submitting ? "送信中..." : "✅ 支援を申し込む"}
              </button>
            </div>
          )}

          {/* STEP 4 完了 */}
          {step === "done" && (
            <div>
              <div style={{ background:"#fff", borderRadius:14, padding:28, boxShadow:"0 4px 20px rgba(0,0,0,.10)", textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:64, marginBottom:12 }}>🎉</div>
                <h2 style={{ color:"#22c55e", fontSize:22, marginBottom:8 }}>申し込み完了！</h2>
                <p style={{ color:"#555", fontSize:14, lineHeight:1.8, marginBottom:20 }}>
                  {name} 様のご支援ありがとうございます。<br />
                  <strong>{email}</strong> に振込先・振込番号を送りました。<br />
                  メールをご確認ください。
                </p>
                <div style={{ background:"linear-gradient(135deg,#0a1628,#1a3060)", borderRadius:12, padding:"20px", marginBottom:20 }}>
                  <div style={{ color:"#aac", fontSize:12, marginBottom:4 }}>管理番号</div>
                  <div style={{ color:"#d4af37", fontFamily:"monospace", fontSize:44, fontWeight:"bold", letterSpacing:6 }}>
                    {transferCode}
                  </div>
                  <div style={{ color:"#aac", fontSize:12, marginTop:4 }}>振込名義人名の前に必ず記載してください</div>
                </div>
                <div style={{ background:"#f0f9ff", borderRadius:10, padding:14, textAlign:"left", fontSize:13, color:"#555", lineHeight:1.8, marginBottom:20 }}>
                  <strong>📧 メールが届かない場合</strong><br />
                  迷惑メールフォルダをご確認ください。<br />
                  それでも届かない場合は <strong>narabadocf@gmail.com</strong> までご連絡ください。
                </div>
              </div>
              <Link href={`/projects/${projectId}`}
                style={{ display:"block", background:"linear-gradient(135deg,#d4af37,#f0c040)", color:"#0a1628", textAlign:"center", borderRadius:10, padding:15, fontWeight:"bold", fontSize:16, textDecoration:"none", marginBottom:12 }}>
                プロジェクトページへ戻る
              </Link>
              <Link href="/"
                style={{ display:"block", background:"transparent", color:"#555", textAlign:"center", borderRadius:10, padding:13, fontWeight:"bold", fontSize:15, textDecoration:"none", border:"2px solid #ddd" }}>
                トップページへ
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div style={{ textAlign:"center", padding:80, color:"#888" }}>読み込み中...</div>}>
      <SupportPageInner />
    </Suspense>
  );
}
