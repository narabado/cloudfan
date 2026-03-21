"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// モバイル判定フック
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
  story: `▼クラブについて\n北星学園女子バドミントン部は2025年、創部以来41年ぶりとなる北海道全道優勝を達成しました。長年の努力が実り、全道の頂点に立った選手たちは今、全国の舞台を目指しています。\n\n▼目標\n全国大会への遠征費・参加費・ユニフォーム等の用具費用について、皆様のご支援をお願いいたします。目標金額¥500,000で全国大会への挑戦が実現します。\n\n▼メッセージ\n「応援してくださる皆さんの力を胸に、全国の舞台で北海道の力を見せたいと思います。ご支援よろしくお願いします！」（部長）`,
  rewardTiers: [
    { tier: "ブロンズ", amount: 3000, description: "お礼メール＋活動報告レポート送付" },
    { tier: "シルバー", amount: 10000, description: "ブロンズ特典＋直筆感謝状" },
    { tier: "ゴールド", amount: 30000, description: "シルバー特典＋横断幕へのお名前掲載" },
    { tier: "プラチナ", amount: 100000, description: "ゴールド特典＋学校訪問・激励会へのご招待" },
    { tier: "レジェンド", amount: 300000, description: "プラチナ特典＋特別顧問称号・記念品贈呈" },
  ],
};

const tierColor: Record<string, string> = {
  ブロンズ: "#cd7f32", シルバー: "#aaa", ゴールド: "#d4af37",
  プラチナ: "#5be", レジェンド: "#e55",
};

function parseStorySections(story: string) {
  return story.split(/(?=▼)/).map(section => {
    const lines = section.trim().split("\n");
    const title = lines[0].startsWith("▼") ? lines[0].replace("▼", "").trim() : "";
    const content = (title ? lines.slice(1) : lines).join("\n").trim();
    return { title, content };
  });
}

function extractYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

export default function ProjectDetail() {
  const isMobile = useIsMobile();
  const project = STATIC_PROJECT;
  const [supporters, setSupporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("supporters")
        .select("name, tier, total_amount, message, created_at")
        .eq("status", "approved")
        .eq("project_title", project.title)
        .order("total_amount", { ascending: false });
      setSupporters(data ?? []);
      setLoading(false);
    })();
  }, []);

  const totalAmount = supporters.reduce((s, r) => s + (r.total_amount || 0), 0);
  const pct = project.goal > 0 ? Math.min(Math.round((totalAmount / project.goal) * 100), 100) : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(project.deadlineISO).getTime() - Date.now()) / 86400000));
  const youtubeId = project.youtubeUrl ? extractYouTubeId(project.youtubeUrl) : null;
  const storySections = parseStorySections(project.story);

  // サイドバー（モバイルでは上部に表示）
  const SideBar = () => (
    <div style={{ width: isMobile ? "100%" : 300, flexShrink: 0 }}>
      {/* 支援進捗 */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,.08)", marginBottom: 16,
        border: "2px solid #d4af37",
      }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>累計支援金額</div>
        <div style={{ fontSize: 32, fontWeight: "bold", color: "#0a1628", marginBottom: 8 }}>
          ¥{totalAmount.toLocaleString()}
        </div>
        <div style={{ background: "#e2e8f0", borderRadius: 8, height: 12, marginBottom: 8, overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(90deg, #d4af37, #f0d060)",
            width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width .6s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginBottom: 16 }}>
          <span style={{ fontWeight: "bold", color: "#d4af37" }}>{pct}% 達成</span>
          <span>目標 ¥{project.goal.toLocaleString()}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { label: "支援者数", value: `${supporters.length}名` },
            { label: "残り日数", value: `${daysLeft}日` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", background: "#f5f7fa", borderRadius: 8, padding: "10px 8px" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontWeight: "bold", color: "#0a1628", fontSize: 20 }}>{item.value}</div>
            </div>
          ))}
        </div>
        <a href="#support" style={{
          display: "block", textAlign: "center",
          background: "#d4af37", color: "#0a1628",
          padding: "14px", borderRadius: 50,
          textDecoration: "none", fontWeight: "bold", fontSize: 16,
          boxShadow: "0 4px 12px rgba(212,175,55,.4)",
        }}>
          🏸 今すぐ支援する
        </a>
      </div>

      {/* 締切・シェア */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          ⏰ 締切：<strong>{project.deadline}</strong>
        </div>
        <div style={{ fontWeight: "bold", color: "#0a1628", marginBottom: 10, fontSize: 13 }}>📢 シェアする</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}&url=${encodeURIComponent("https://sports-support-hokkaido.vercel.app/projects/1")}`}
            target="_blank" rel="noreferrer"
            style={{ background: "#000", color: "#fff", padding: "8px", borderRadius: 8, textDecoration: "none", fontSize: 13, textAlign: "center", fontWeight: "bold" }}>
            𝕏 ポスト
          </a>
          <a href={`https://line.me/R/share?text=${encodeURIComponent(project.title + " https://sports-support-hokkaido.vercel.app/projects/1")}`}
            target="_blank" rel="noreferrer"
            style={{ background: "#06c755", color: "#fff", padding: "8px", borderRadius: 8, textDecoration: "none", fontSize: 13, textAlign: "center", fontWeight: "bold" }}>
            LINE
          </a>
        </div>
        <a href="/admin/project-edit?id=1" style={{ display: "block", textAlign: "center", color: "#94a3b8", fontSize: 12, textDecoration: "none" }}>
          ✏️ 管理者編集
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>

      {/* ナビゲーション */}
      <nav style={{
        background: "#0a1628", borderBottom: "3px solid #d4af37",
        padding: "0 16px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          height: 52,
        }}>
          <a href="/" style={{
            color: "#d4af37", fontWeight: "bold", textDecoration: "none",
            fontSize: isMobile ? 12 : 15, whiteSpace: "nowrap",
          }}>
            🏸 {isMobile ? "BSH" : "BADMINTON SUPPORT HOKKAIDO"}
          </a>
          <div style={{ display: "flex", gap: isMobile ? 12 : 24, alignItems: "center" }}>
            <a href="/projects/1" style={{ color: "#fff", textDecoration: "none", fontSize: isMobile ? 12 : 14 }}>
              プロジェクト
            </a>
            <a href="#support" style={{
              background: "#d4af37", color: "#0a1628",
              padding: isMobile ? "5px 10px" : "6px 16px",
              borderRadius: 20, fontWeight: "bold",
              textDecoration: "none", fontSize: isMobile ? 11 : 13,
            }}>
              支援する
            </a>
            <a href="/admin" style={{ color: "#94a3b8", textDecoration: "none", fontSize: isMobile ? 11 : 13 }}>
              管理
            </a>
          </div>
        </div>
      </nav>

      {/* ヒーロー */}
      <div style={{
        background: "linear-gradient(135deg, #0a1628 0%, #1e3a6e 60%, #0f2040 100%)",
        padding: isMobile ? "28px 16px" : "48px 24px",
        color: "#fff", borderBottom: "4px solid #d4af37",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#d4af37", marginBottom: 8 }}>
            {project.school}　{project.club}
          </div>
          <h1 style={{ fontSize: isMobile ? 18 : 30, fontWeight: "bold", lineHeight: 1.4, margin: "0 0 14px" }}>
            {project.title}
          </h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "#22c55e", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold" }}>
              ● {project.status}
            </span>
            <span style={{ color: "#94a3b8", fontSize: 13 }}>締切：{project.deadline}</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px 16px" : "36px 24px" }}>

        {/* モバイルではサイドバーを先に表示 */}
        {isMobile && <SideBar />}

        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 24 : 40,
          alignItems: "flex-start",
          marginTop: isMobile ? 24 : 0,
        }}>
          {/* 左：メインコンテンツ */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* YouTube */}
            {youtubeId && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* ストーリー */}
            <div style={{
              background: "#fff", borderRadius: 12,
              padding: isMobile ? "20px 16px" : "32px",
              marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,.06)",
            }}>
              {storySections.map((section, i) => (
                <div key={i} style={{ marginBottom: i < storySections.length - 1 ? 28 : 0 }}>
                  {section.title && (
                    <h2 style={{
                      fontSize: 17, color: "#0a1628",
                      borderLeft: "4px solid #d4af37", paddingLeft: 12,
                      margin: "0 0 10px",
                    }}>
                      {section.title}
                    </h2>
                  )}
                  <p style={{ color: "#444", lineHeight: 1.85, whiteSpace: "pre-wrap", margin: 0, fontSize: 14 }}>
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            {/* 支援リターン */}
            <h2 id="support" style={{ fontSize: isMobile ? 18 : 22, color: "#0a1628", marginBottom: 14 }}>
              🎁 支援リターン
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14, marginBottom: 32,
            }}>
              {project.rewardTiers.map((tier, i) => (
                <div key={i} style={{
                  background: "#fff", borderRadius: 12, padding: 18,
                  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                  borderTop: `4px solid ${tierColor[tier.tier] ?? "#ccc"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: "bold", color: tierColor[tier.tier], fontSize: 15 }}>{tier.tier}</span>
                    <span style={{ fontWeight: "bold", fontSize: 16 }}>¥{tier.amount.toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#555", margin: "0 0 12px", lineHeight: 1.6 }}>
                    {tier.description}
                  </p>
                  <a href={`/support?project=${project.id}&tier=${tier.tier}&amount=${tier.amount}`} style={{
                    display: "block", textAlign: "center",
                    background: tierColor[tier.tier] ?? "#0a1628", color: "#fff",
                    padding: "8px 16px", borderRadius: 8, textDecoration: "none",
                    fontWeight: "bold", fontSize: 13,
                  }}>
                    このコースで支援する
                  </a>
                </div>
              ))}
            </div>

            {/* 支援者一覧 */}
            <h2 style={{ fontSize: isMobile ? 18 : 22, color: "#0a1628", marginBottom: 14 }}>
              👥 支援者一覧
            </h2>
            {loading ? (
              <p style={{ color: "#888" }}>読み込み中...</p>
            ) : supporters.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: "24px 20px", color: "#888", textAlign: "center", fontSize: 14 }}>
                まだ支援者はいません。最初の支援者になりましょう！
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)", marginBottom: 24 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
                    <thead style={{ background: "#0a1628", color: "#fff" }}>
                      <tr>
                        {["名前", "ティア", "金額", "コメント"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 13 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {supporters.map((s, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                          <td style={{ padding: "10px 14px", fontSize: 14 }}>{s.name}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ color: tierColor[s.tier] ?? "#333", fontWeight: "bold", fontSize: 13 }}>{s.tier}</span>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: "bold", fontSize: 14 }}>
                            ¥{(s.total_amount || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#666" }}>{s.message || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 右：サイドバー（PCのみ） */}
          {!isMobile && <SideBar />}
        </div>
      </div>

      {/* フッター */}
      <footer style={{
        background: "#0a1628", color: "#64748b", textAlign: "center",
        padding: "20px 16px", marginTop: 48, fontSize: 12,
      }}>
        <p style={{ margin: 0 }}>
          © 2026 BADMINTON SUPPORT HOKKAIDO　|　
          <a href="/admin" style={{ color: "#d4af37" }}>管理画面</a>
        </p>
      </footer>
    </div>
  );
}
