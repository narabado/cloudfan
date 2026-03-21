"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATIC_PROJECT = {
  id: 1,
  school: "北星学園女子中学高等学校",
  club: "バドミントン部",
  title: "41年ぶりの全道優勝！北星学園女子バドミントン部を応援しよう",
  goal: 500000,
  deadline: "2026年5月7日",
  deadlineISO: "2026-05-07",
  status: "募集中",
  youtubeUrl: "",
  images: [] as string[],
  story: `▼ クラブについて
北星学園女子中学高等学校バドミントン部は、41年ぶりの全道優勝を目指して日々練習に励んでいます。

▼ 活動内容
週5日の練習、全道大会・全国大会への出場を目指しています。

▼ 支援の使い道
・遠征費・交通費
・ユニフォーム・用具購入
・練習施設利用費`,
  // ★ 金額を正しく修正
  rewardTiers: [
    { tier: "ブロンズ",   amount: 1000,   description: "お礼メール＋活動報告レポート送付" },
    { tier: "シルバー",   amount: 3000,   description: "上記＋クラブオリジナルステッカー" },
    { tier: "ゴールド",   amount: 10000,  description: "上記＋選手からの直筆サイン色紙" },
    { tier: "プラチナ",   amount: 30000,  description: "上記＋練習見学招待＋記念写真撮影" },
    { tier: "レジェンド", amount: 100000, description: "上記＋スポンサー名をユニフォームに掲載" },
  ],
};

const tierColor: Record<string, string> = {
  ブロンズ: "#cd7f32",
  シルバー: "#aaa",
  ゴールド: "#d4af37",
  プラチナ: "#5be",
  レジェンド: "#e55",
};

const tierIcon: Record<string, string> = {
  ブロンズ: "🥉",
  シルバー: "🥈",
  ゴールド: "🥇",
  プラチナ: "💎",
  レジェンド: "👑",
};

type Supporter = {
  name: string;
  tier: string;
  total_amount: number;
  message: string;
  created_at: string;
};

export default function ProjectDetail() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("supporters")
        .select("name, tier, total_amount, message, created_at")
        .eq("status", "approved")
        .eq("project_title", STATIC_PROJECT.title)
        .order("total_amount", { ascending: false });
      setSupporters((data as Supporter[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const totalAmount = supporters.reduce((s, r) => s + (r.total_amount || 0), 0);
  const pct = STATIC_PROJECT.goal
    ? Math.min(Math.round((totalAmount / STATIC_PROJECT.goal) * 100), 100)
    : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(STATIC_PROJECT.deadlineISO).getTime() - Date.now()) / 86400000)
  );

  const siteUrl = "https://sports-support-hokkaido.vercel.app/projects/1";
  const shareText = encodeURIComponent(
    `${STATIC_PROJECT.title} を応援しています！ #バドミントン #北海道`
  );
  // ★ Facebook共有URL
  const fbUrl  = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
  const twUrl  = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(siteUrl)}`;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(STATIC_PROJECT.title + "\n" + siteUrl)}`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .project-nav {
          background: #0a1628; color: #fff;
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 3px solid #d4af37;
          position: sticky; top: 0; z-index: 100;
        }
        .nav-title { font-size: 16px; font-weight: bold; color: #d4af37; text-decoration: none; }
        .nav-links { display: flex; gap: 16px; }
        .nav-link  { color: #ccc; font-size: 13px; text-decoration: none; white-space: nowrap; }
        .nav-link:hover { color: #d4af37; }

        .project-layout {
          max-width: 1100px; margin: 0 auto;
          padding: 32px 20px;
          display: flex; gap: 32px; align-items: flex-start;
        }
        .project-main  { flex: 1; min-width: 0; }
        .project-sidebar { width: 320px; flex-shrink: 0; position: sticky; top: 80px; }
        .sidebar-mobile  { display: none; }
        .sidebar-desktop { display: block; }

        .progress-bar-bg   { background: #e2e8f0; border-radius: 99px; height: 12px; overflow: hidden; margin: 8px 0; }
        .progress-bar-fill { background: linear-gradient(90deg,#d4af37,#f0c040); border-radius: 99px; height: 100%; transition: width .6s; }

        .tier-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-top: 12px; }

        .supporter-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .supporter-table th { background: #0a1628; color: #fff; padding: 10px 14px; text-align: left; }
        .supporter-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
        .supporter-table tr:nth-child(even) td { background: #f9fafb; }

        /* ★ 共有ボタン3つを横並び */
        .share-btns { display: flex; gap: 8px; }
        .share-btn  { flex: 1; text-align: center; border-radius: 8px; padding: 9px 4px; font-size: 13px; font-weight: bold; text-decoration: none; }

        @media (max-width: 767px) {
          .project-nav   { padding: 12px 16px; }
          .nav-title     { font-size: 13px; }
          .nav-link      { font-size: 12px; }
          .nav-links     { gap: 10px; }
          .project-layout { flex-direction: column; padding: 0 0 32px 0; gap: 0; }
          .project-main  { padding: 16px; }
          .project-sidebar { width: 100%; position: static; }
          .sidebar-mobile  { display: block; padding: 0 16px 16px 16px; }
          .sidebar-desktop { display: none; }
          .tier-grid     { grid-template-columns: 1fr; }
          .supporter-table { font-size: 12px; }
          .supporter-table th, .supporter-table td { padding: 8px 10px; }
          .table-wrap    { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `}</style>

      <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>

        {/* Navigation */}
        <nav className="project-nav">
          <Link href="/" className="nav-title">🏸 BADMINTON SUPPORT HOKKAIDO</Link>
          <div className="nav-links">
            <Link href="/"   className="nav-link">← トップ</Link>
            <Link href="/admin/project-edit?id=1" className="nav-link">✏️ 編集</Link>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg,#0a1628 0%,#1a3060 100%)", padding: "40px 20px", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "#d4af37", color: "#0a1628", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: "bold", marginBottom: 12 }}>
            {STATIC_PROJECT.status}
          </div>
          <h1 style={{ color: "#fff", fontSize: "clamp(18px,4vw,28px)", fontWeight: "bold", maxWidth: 700, margin: "0 auto 8px", lineHeight: 1.4 }}>
            {STATIC_PROJECT.title}
          </h1>
          <p style={{ color: "#aac", fontSize: 14 }}>{STATIC_PROJECT.school}　{STATIC_PROJECT.club}</p>
        </div>

        {/* Mobile Sidebar */}
        <div className="sidebar-mobile">
          <SidebarCard
            totalAmount={totalAmount} pct={pct} goal={STATIC_PROJECT.goal}
            supporters={supporters} daysLeft={daysLeft} deadline={STATIC_PROJECT.deadline}
            twUrl={twUrl} lineUrl={lineUrl} fbUrl={fbUrl}
          />
        </div>

        {/* Main Layout */}
        <div className="project-layout">
          <div className="project-main">

            {/* Story */}
            <section style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
              <h2 style={{ color: "#0a1628", fontSize: 18, borderBottom: "2px solid #d4af37", paddingBottom: 8, marginBottom: 16 }}>📖 プロジェクト詳細</h2>
              <div style={{ lineHeight: 1.8, color: "#333", whiteSpace: "pre-wrap", fontSize: 15 }}>
                {STATIC_PROJECT.story}
              </div>
            </section>

            {/* YouTube */}
            {STATIC_PROJECT.youtubeUrl && (
              <section style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                <h2 style={{ color: "#0a1628", fontSize: 18, borderBottom: "2px solid #d4af37", paddingBottom: 8, marginBottom: 16 }}>🎬 紹介動画</h2>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden" }}>
                  <iframe
                    src={STATIC_PROJECT.youtubeUrl.replace("watch?v=", "embed/")}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* ★ 支援ティア（金額修正済み） */}
            <section style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
              <h2 style={{ color: "#0a1628", fontSize: 18, borderBottom: "2px solid #d4af37", paddingBottom: 8, marginBottom: 16 }}>🎁 支援ティア・特典</h2>
              <div className="tier-grid">
                {STATIC_PROJECT.rewardTiers.map(t => (
                  <div key={t.tier} style={{ border: `2px solid ${tierColor[t.tier] ?? "#ddd"}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ background: tierColor[t.tier] ?? "#ddd", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: "bold" }}>
                        {tierIcon[t.tier]} {t.tier}
                      </span>
                      <span style={{ fontWeight: "bold", color: "#0a1628" }}>¥{t.amount.toLocaleString()}〜</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>{t.description}</p>
                    <Link
                      href={`/support?project=1&tier=${encodeURIComponent(t.tier)}&amount=${t.amount}`}
                      style={{ display: "block", marginTop: 12, background: tierColor[t.tier] ?? "#d4af37", color: "#fff", textAlign: "center", borderRadius: 6, padding: "8px", fontSize: 13, fontWeight: "bold", textDecoration: "none" }}
                    >
                      このティアで支援
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* 支援者一覧 */}
            <section style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
              <h2 style={{ color: "#0a1628", fontSize: 18, borderBottom: "2px solid #d4af37", paddingBottom: 8, marginBottom: 16 }}>
                👥 支援者一覧（{supporters.length}名）
              </h2>
              {loading ? (
                <p style={{ color: "#888", textAlign: "center", padding: 32 }}>読み込み中...</p>
              ) : supporters.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", padding: 32 }}>まだ支援者はいません。最初の支援者になりましょう！</p>
              ) : (
                <div className="table-wrap">
                  <table className="supporter-table">
                    <thead>
                      <tr>
                        <th>名前</th>
                        <th>ティア</th>
                        <th>金額</th>
                        <th>コメント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supporters.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: "bold" }}>{s.name}</td>
                          <td><span style={{ color: tierColor[s.tier] ?? "#333", fontWeight: "bold" }}>{tierIcon[s.tier]}{s.tier}</span></td>
                          <td style={{ fontWeight: "bold", color: "#d4af37" }}>¥{(s.total_amount || 0).toLocaleString()}</td>
                          <td style={{ color: "#555", fontSize: 12 }}>{s.message || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Desktop Sidebar */}
          <aside className="project-sidebar sidebar-desktop">
            <SidebarCard
              totalAmount={totalAmount} pct={pct} goal={STATIC_PROJECT.goal}
              supporters={supporters} daysLeft={daysLeft} deadline={STATIC_PROJECT.deadline}
              twUrl={twUrl} lineUrl={lineUrl} fbUrl={fbUrl}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

/* ── Sidebar Component ── */
function SidebarCard({
  totalAmount, pct, goal, supporters, daysLeft, deadline, twUrl, lineUrl, fbUrl,
}: {
  totalAmount: number; pct: number; goal: number;
  supporters: Supporter[]; daysLeft: number; deadline: string;
  twUrl: string; lineUrl: string; fbUrl: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,.10)", border: "2px solid #d4af37" }}>
      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: "#888" }}>達成率</span>
          <span style={{ fontWeight: "bold", color: "#d4af37", fontSize: 18 }}>{pct}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "支援総額",  value: `¥${totalAmount.toLocaleString()}`, sub: `目標 ¥${goal.toLocaleString()}` },
          { label: "支援者数",  value: `${supporters.length}名`,            sub: "" },
          { label: "残り日数",  value: `${daysLeft}日`,                     sub: deadline + "まで" },
          { label: "達成率",    value: `${pct}%`,                           sub: "" },
        ].map(c => (
          <div key={c.label} style={{ background: "#f5f7fa", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#888" }}>{c.label}</div>
            <div style={{ fontWeight: "bold", fontSize: 18, color: "#0a1628" }}>{c.value}</div>
            {c.sub && <div style={{ fontSize: 10, color: "#aaa" }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <Link
        href="/support?project=1"
        style={{ display: "block", background: "linear-gradient(135deg,#d4af37,#f0c040)", color: "#0a1628", textAlign: "center", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: "bold", textDecoration: "none", marginBottom: 12, boxShadow: "0 4px 12px rgba(212,175,55,.4)" }}
      >
        🏸 このプロジェクトを支援する
      </Link>

      {/* ★ 共有ボタン3つ（X・LINE・Facebook） */}
      <div className="share-btns">
        <a href={twUrl} target="_blank" rel="noreferrer" className="share-btn"
          style={{ background: "#000", color: "#fff" }}>
          𝕏 シェア
        </a>
        <a href={lineUrl} target="_blank" rel="noreferrer" className="share-btn"
          style={{ background: "#06c755", color: "#fff" }}>
          LINE
        </a>
        <a href={fbUrl} target="_blank" rel="noreferrer" className="share-btn"
          style={{ background: "#1877f2", color: "#fff" }}>
          Facebook
        </a>
      </div>
    </div>
  );
}
