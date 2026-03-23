"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const FEATURED_PROJECT = {
  id: 1,
  school: "北星学園女子中学高等学校",
  club: "バドミントン部",
  title: "41年ぶりの全道優勝！北星学園女子バドミントン部を応援しよう",
  goal: 500000,
  deadline: "2026年5月7日",
  deadlineISO: "2026-05-07",
  description: "北海道のバドミントン部が41年ぶりの全道優勝を目指しています。遠征費・用具購入費のご支援をお願いします。",
  status: "募集中",
};

// ★ 金額・説明文・amountVal を正しい値に修正
const TIERS = [
  { name: "ブロンズ",   amount: "¥1,000〜",   amountVal: 1000,   color: "#cd7f32", icon: "🥉", desc: "お礼メール＋活動報告レポート送付" },
  { name: "シルバー",   amount: "¥3,000〜",   amountVal: 3000,   color: "#aaa",    icon: "🥈", desc: "上記＋クラブオリジナルステッカー" },
  { name: "ゴールド",   amount: "¥10,000〜",  amountVal: 10000,  color: "#d4af37", icon: "🥇", desc: "上記＋選手からの直筆サイン色紙" },
  { name: "プラチナ",   amount: "¥30,000〜",  amountVal: 30000,  color: "#5be",    icon: "💎", desc: "上記＋練習見学招待＋記念写真撮影" },
  { name: "レジェンド", amount: "¥100,000〜", amountVal: 100000, color: "#e55",    icon: "👑", desc: "上記＋スポンサー名をユニフォームに掲載" },
];

const STEPS = [
  { step: "01", title: "プロジェクトを選ぶ",   desc: "応援したいチームを選択してください" },
  { step: "02", title: "支援ティアを決める",   desc: "¥1,000〜の5段階から選べます" }, // ★ 修正
  { step: "03", title: "申し込みフォーム入力", desc: "お名前・メールアドレスを入力" },
  { step: "04", title: "銀行振込で支援完了",   desc: "振込確認後に特典をお届けします" },
];

export default function TopPage() {
  const [currentAmount, setCurrentAmount] = useState(0);
  const [supporterCount, setSupporterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(FEATURED_PROJECT.deadlineISO).getTime() - Date.now()) / 86400000
      )
    );
    setDaysLeft(days);

    (async () => {
      const { data } = await supabase
        .from("supporters")
        .select("total_amount")
        .eq("status", "approved");
      if (data) {
        const total = data.reduce((s, r) => s + (r.total_amount || 0), 0);
        setCurrentAmount(total);
        setSupporterCount(data.length);
      }
      setLoading(false);
    })();
  }, []);

  const pct = FEATURED_PROJECT.goal
    ? Math.min(Math.round((currentAmount / FEATURED_PROJECT.goal) * 100), 100)
    : 0;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        .top-nav {
          background: #0a1628;
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #d4af37;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-brand { color: #d4af37; font-weight: bold; font-size: clamp(13px, 2.5vw, 18px); text-decoration: none; }
        .nav-admin { color: #aaa; font-size: 13px; text-decoration: none; padding: 6px 14px; border: 1px solid #444; border-radius: 6px; }
        .nav-admin:hover { color: #d4af37; border-color: #d4af37; }

        .hero {
          background: linear-gradient(135deg, #0a1628 0%, #1a3060 60%, #0a1628 100%);
          padding: clamp(40px, 8vw, 80px) 24px;
          text-align: center;
          color: #fff;
        }
        .hero-badge {
          display: inline-block;
          background: #d4af37;
          color: #0a1628;
          border-radius: 20px;
          padding: 4px 16px;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .hero-title {
          font-size: clamp(22px, 5vw, 42px);
          font-weight: bold;
          line-height: 1.3;
          margin-bottom: 16px;
          text-shadow: 0 2px 8px rgba(0,0,0,.3);
        }
        .hero-sub {
          font-size: clamp(14px, 2vw, 16px);
          color: #aac;
          margin-bottom: 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .hero-btns {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-primary {
          background: linear-gradient(135deg, #d4af37, #f0c040);
          color: #0a1628;
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 4px 14px rgba(212,175,55,.5);
          transition: transform .15s;
        }
        .btn-primary:hover { transform: translateY(-2px); }
        .btn-secondary {
          background: transparent;
          color: #d4af37;
          padding: 14px 32px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          text-decoration: none;
          display: inline-block;
          border: 2px solid #d4af37;
        }

        .stats-bar {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 24px;
          display: flex;
          justify-content: center;
          gap: clamp(24px, 6vw, 80px);
          flex-wrap: wrap;
        }
        .stat-item { text-align: center; }
        .stat-value { font-size: clamp(20px, 4vw, 32px); font-weight: bold; color: #d4af37; }
        .stat-label { font-size: 12px; color: #888; margin-top: 4px; }

        .section { max-width: 1100px; margin: 0 auto; padding: clamp(32px, 6vw, 64px) 20px; }
        .section-title {
          font-size: clamp(20px, 3.5vw, 28px);
          font-weight: bold;
          color: #0a1628;
          text-align: center;
          margin-bottom: 8px;
        }
        .section-sub { text-align: center; color: #888; font-size: 14px; margin-bottom: 40px; }

        .project-card {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,.10);
          border: 2px solid #d4af37;
          max-width: 760px;
          margin: 0 auto;
        }
        .project-card-body { padding: 28px; }
        .progress-bg { background: #e2e8f0; border-radius: 99px; height: 10px; margin: 10px 0; }
        .progress-fill {
          background: linear-gradient(90deg, #d4af37, #f0c040);
          border-radius: 99px;
          height: 100%;
          transition: width 0.6s;
        }
        .project-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .project-stat { text-align: center; background: #f5f7fa; border-radius: 8px; padding: 10px; }
        .project-stat-value { font-weight: bold; font-size: 18px; color: #0a1628; }
        .project-stat-label { font-size: 11px; color: #888; }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .step-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
          border-top: 4px solid #d4af37;
        }
        .step-num { font-size: 32px; font-weight: bold; color: #d4af37; margin-bottom: 8px; }
        .step-title { font-weight: bold; color: #0a1628; margin-bottom: 6px; font-size: 15px; }
        .step-desc { font-size: 13px; color: #666; line-height: 1.6; }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .tier-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
          transition: transform .15s;
        }
        .tier-card:hover { transform: translateY(-4px); }

        .cta-section {
          background: linear-gradient(135deg, #0a1628, #1a3060);
          padding: clamp(40px, 8vw, 80px) 24px;
          text-align: center;
          color: #fff;
        }

        footer {
          background: #0a1628;
          color: #aaa;
          text-align: center;
          padding: 24px;
          font-size: 13px;
          border-top: 3px solid #d4af37;
        }

        @media (max-width: 600px) {
          .hero-btns { flex-direction: column; align-items: center; }
          .btn-primary, .btn-secondary { width: 100%; max-width: 300px; text-align: center; }
          .project-stats { grid-template-columns: repeat(3, 1fr); }
          .tiers-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 400px) {
          .tiers-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>

        {/* Navigation */}
        <nav className="top-nav">
          <span className="nav-brand">🏸 BADMINTON SUPPORT HOKKAIDO</span>
          <a href="/admin" className="nav-admin">🔧 管理画面</a>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">🏆 北海道スポーツ支援プロジェクト</div>
          <h1 className="hero-title">
            北海道の部活動を<br />
            みんなで応援しよう
          </h1>
          <p className="hero-sub">
            クラウドファンディングで夢を持つ学生アスリートを支援。<br />
            あなたの応援が全道・全国制覇への力になります。
          </p>
          <div className="hero-btns">
            <Link href="/projects/1" className="btn-primary">🏸 プロジェクトを見る</Link>
            <Link href="/support?project=1" className="btn-secondary">今すぐ支援する</Link>
          </div>
        </section>

        {/* Stats Bar */}
        <div className="stats-bar">
          {[
            { value: loading ? "---" : `¥${currentAmount.toLocaleString()}`, label: "総支援金額" },
            { value: loading ? "---" : `${supporterCount}名`, label: "支援者数" },
            { value: "1件", label: "進行中プロジェクト" },
            { value: `${daysLeft}日`, label: "最新締切まで" },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Project */}
        <section className="section">
          <h2 className="section-title">🏸 注目プロジェクト</h2>
          <p className="section-sub">現在募集中のクラウドファンディング</p>
          <div className="project-card">
            <div style={{ background: "linear-gradient(135deg,#0a1628,#1a3060)", padding: "20px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ background: "#d4af37", color: "#0a1628", borderRadius: 20, padding: "3px 14px", fontSize: 12, fontWeight: "bold", whiteSpace: "nowrap" }}>
                {FEATURED_PROJECT.status}
              </div>
              <div>
                <div style={{ color: "#aac", fontSize: 12 }}>{FEATURED_PROJECT.school}　{FEATURED_PROJECT.club}</div>
              </div>
            </div>
            <div className="project-card-body">
              <h3 style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: "bold", color: "#0a1628", marginBottom: 8, lineHeight: 1.4 }}>
                {FEATURED_PROJECT.title}
              </h3>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                {FEATURED_PROJECT.description}
              </p>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888", marginBottom: 4 }}>
                  <span>達成率</span>
                  <span style={{ fontWeight: "bold", color: "#d4af37" }}>{pct}%</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="project-stats">
                <div className="project-stat">
                  <div className="project-stat-value">¥{currentAmount.toLocaleString()}</div>
                  <div className="project-stat-label">支援総額</div>
                </div>
                <div className="project-stat">
                  <div className="project-stat-value">{supporterCount}名</div>
                  <div className="project-stat-label">支援者数</div>
                </div>
                <div className="project-stat">
                  <div className="project-stat-value">{daysLeft}日</div>
                  <div className="project-stat-label">残り日数</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/support?project=1" style={{ flex: 1, minWidth: 140, background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#0a1628", textAlign: "center", borderRadius: 10, padding: "13px", fontWeight: "bold", fontSize: 15, textDecoration: "none", display: "block" }}>
                  🏸 支援する
                </Link>
                <Link href="/projects/1" style={{ flex: 1, minWidth: 140, background: "transparent", color: "#0a1628", textAlign: "center", borderRadius: 10, padding: "13px", fontWeight: "bold", fontSize: 15, textDecoration: "none", border: "2px solid #0a1628", display: "block" }}>
                  詳細を見る
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ background: "#fff", padding: "clamp(32px,6vw,64px) 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 className="section-title">📋 支援の流れ</h2>
            <p className="section-sub">簡単4ステップで応援できます</p>
            <div className="steps-grid">
              {STEPS.map((s) => (
                <div key={s.step} className="step-card">
                  <div className="step-num">{s.step}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="section">
          <h2 className="section-title">🎁 支援ティア</h2>
          <p className="section-sub">金額に応じた特典をご用意しています</p>
          <div className="tiers-grid">
            {TIERS.map((t) => (
              <div key={t.name} className="tier-card" style={{ borderTop: `4px solid ${t.color}` }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontWeight: "bold", color: t.color, fontSize: 16, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontWeight: "bold", color: "#0a1628", marginBottom: 8 }}>{t.amount}</div>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{t.desc}</div>
                {/* ★ amountVal を追加して支援フォームで金額が自動入力されるように */}
                <Link
                  href={`/support?project=1&tier=${encodeURIComponent(t.name)}&amount=${t.amountVal}`}
                  style={{ display: "block", marginTop: 12, background: t.color, color: "#fff", borderRadius: 6, padding: "8px", fontSize: 13, fontWeight: "bold", textDecoration: "none" }}
                >
                  このティアで支援
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏸</div>
          <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: "bold", marginBottom: 12 }}>
            北海道の夢を、一緒に応援しよう
          </h2>
          <p style={{ color: "#aac", fontSize: 15, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
            あなたの支援が選手たちの全国制覇への力になります
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/support?project=1" className="btn-primary" style={{ background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#0a1628" }}>
              今すぐ支援する
            </Link>
            <Link href="/projects/1" style={{ color: "#d4af37", padding: "14px 32px", borderRadius: 10, fontSize: 16, fontWeight: "bold", textDecoration: "none", border: "2px solid #d4af37", display: "inline-block" }}>
              プロジェクト詳細
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer>
          <div style={{ marginBottom: 8, color: "#d4af37", fontWeight: "bold" }}>🏸 BADMINTON SUPPORT HOKKAIDO</div>
          <div>© 2026 BADMINTON SUPPORT HOKKAIDO. All rights reserved.</div>
          <div style={{ marginTop: 8 }}>
            <a href="/admin" style={{ color: "#666", fontSize: 12, textDecoration: "none" }}>管理者ログイン</a>
          </div>
        </footer>

      </div>
    </>
  );
}
