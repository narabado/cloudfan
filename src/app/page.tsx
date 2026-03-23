"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────
type Project = {
  id: number;
  school: string;
  club: string;
  title: string;
  description: string;
  goal: number;
  deadline: string;
  status: string;
  region: string;
  tiers: { name: string; amount: number }[];
  images: string[];
};

// ────────────────────────────────────────────────
// 支援ステップ
// ────────────────────────────────────────────────
const STEPS = [
  { icon: "🏆", title: "STEP 01", label: "チームを選ぶ", desc: "応援したい学校・部活を探す" },
  { icon: "💰", title: "STEP 02", label: "ティアを選ぶ", desc: "¥1,000〜の5段階から選べます" },
  { icon: "📝", title: "STEP 03", label: "申し込む", desc: "フォームに入力して送信" },
  { icon: "🏦", title: "STEP 04", label: "振込で完了", desc: "振込コードをメールでお送りします" },
];

// ────────────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────────────
function toISODate(jpDate: string): string {
  const m = jpDate?.match(/(\d+)年(\d+)月(\d+)日/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : jpDate ?? "";
}

function calcDaysLeft(deadline: string): number {
  const iso = toISODate(deadline);
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

// ────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────
export default function TopPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [supporters, setSupporters] = useState<{ project_id: number; total_amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 全プロジェクトを取得
      const { data: projData } = await supabase
        .from("crowdfunding_projects")
        .select("*")
        .eq("status", "募集中")
        .order("id", { ascending: true });
      setProjects((projData as Project[]) ?? []);

      // 承認済み支援者を全件取得
      const { data: supData } = await supabase
        .from("supporters")
        .select("project_id, total_amount")
        .eq("status", "approved");
      setSupporters(supData ?? []);

      setLoading(false);
    })();
  }, []);

  // プロジェクト別の集計
  const getStats = (projectId: number) => {
    const sups = supporters.filter((s) => s.project_id === projectId);
    const total = sups.reduce((sum, s) => sum + (s.total_amount ?? 0), 0);
    return { total, count: sups.length };
  };

  // 全体統計
  const totalAmount = supporters.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const totalSupporters = supporters.length;
  const activeProjects = projects.length;
  const minDaysLeft = projects.length > 0
    ? Math.min(...projects.map((p) => calcDaysLeft(p.deadline)))
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

      {/* ── ナビゲーション ── */}
      <nav style={{
        background: "linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%)",
        color: "#fff", padding: "1rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      }}>
        <Link href="/" style={{ color: "#fff", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⛅</span>
          <span style={{ fontWeight: "bold", fontSize: "1.2rem" }}>CloudFan</span>
          <span style={{ fontSize: "0.8rem", opacity: 0.8, marginLeft: "0.25rem" }}>部活クラウドファンディング</span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Link href="#projects" style={{ color: "#fff", textDecoration: "none", opacity: 0.9, fontSize: "0.9rem" }}>
            プロジェクト一覧
          </Link>
          <Link href="/admin" style={{
            color: "#fff", textDecoration: "none",
            background: "rgba(255,255,255,0.2)", padding: "0.4rem 0.8rem",
            borderRadius: "6px", fontSize: "0.85rem",
          }}>
            🛠 管理
          </Link>
        </div>
      </nav>

      {/* ── ヒーローセクション ── */}
      <section style={{
        background: "linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 60%, #4a90d9 100%)",
        color: "#fff", padding: "4rem 2rem", textAlign: "center",
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⛅</div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: "bold", marginBottom: "1rem", lineHeight: 1.3 }}>
            北海道の部活動を<br />みんなで応援しよう
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, marginBottom: "2rem", lineHeight: 1.8 }}>
            CloudFanは北海道の学校部活動を支援するクラウドファンディングプラットフォームです。<br />
            あなたの応援が、選手たちの夢を実現します。
          </p>
          <Link href="#projects" style={{
            display: "inline-block", padding: "1rem 2.5rem",
            background: "#f0a500", color: "#fff",
            borderRadius: "50px", textDecoration: "none",
            fontWeight: "bold", fontSize: "1.1rem",
            boxShadow: "0 4px 15px rgba(240,165,0,0.4)",
          }}>
            🏆 プロジェクトを見る
          </Link>
        </div>
      </section>

      {/* ── 全体統計バー ── */}
      <section style={{
        background: "#1a3a5c", color: "#fff",
        padding: "1.5rem 2rem",
      }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem", textAlign: "center",
        }}>
          {[
            { value: `¥${totalAmount.toLocaleString()}`, label: "総支援金額" },
            { value: `${totalSupporters}名`, label: "支援者数" },
            { value: `${activeProjects}件`, label: "募集中プロジェクト" },
            { value: `${minDaysLeft}日`, label: "最短残り日数" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)", fontWeight: "bold", color: "#f0a500" }}>
                {loading ? "…" : value}
              </div>
              <div style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: "0.25rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── プロジェクト一覧 ── */}
      <section id="projects" style={{ padding: "3rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ color: "#1a3a5c", textAlign: "center", fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          🏆 募集中のプロジェクト
        </h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "2.5rem" }}>
          応援したいチームを選んで支援しましょう
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>読み込み中...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
            現在募集中のプロジェクトはありません
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.5rem",
          }}>
            {projects.map((project) => {
              const { total, count } = getStats(project.id);
              const goal = project.goal ?? 500000;
              const pct = Math.min(Math.round((total / goal) * 100), 100);
              const daysLeft = calcDaysLeft(project.deadline);
              const minTier = project.tiers?.length > 0
                ? Math.min(...project.tiers.map((t) => t.amount))
                : 1000;

              return (
                <div key={project.id} style={{
                  background: "#fff", borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
                  }}
                >
                  {/* カードヘッダー */}
                  <div style={{
                    background: "linear-gradient(135deg, #1a3a5c, #2d6a9f)",
                    padding: "1.25rem", color: "#fff",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "0.8rem", opacity: 0.8, marginBottom: "0.25rem" }}>
                          {project.school}
                        </div>
                        <div style={{ fontWeight: "bold", fontSize: "0.95rem" }}>
                          {project.club}
                        </div>
                      </div>
                      <span style={{
                        background: daysLeft <= 7 ? "#e55" : "#f0a500",
                        padding: "0.25rem 0.6rem", borderRadius: "20px",
                        fontSize: "0.75rem", fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}>
                        残り{daysLeft}日
                      </span>
                    </div>
                    <h3 style={{ margin: "0.75rem 0 0", fontSize: "1rem", lineHeight: 1.4 }}>
                      {project.title}
                    </h3>
                  </div>

                  {/* カードボディ */}
                  <div style={{ padding: "1.25rem" }}>
                    {/* 達成率バー */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#666" }}>達成率</span>
                        <span style={{ fontWeight: "bold", color: "#1a3a5c" }}>{pct}%</span>
                      </div>
                      <div style={{ background: "#e8f0fe", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: "linear-gradient(90deg, #2d6a9f, #f0a500)",
                          borderRadius: "10px", transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>

                    {/* 統計 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem", textAlign: "center" }}>
                      {[
                        { v: `¥${total.toLocaleString()}`, l: "支援総額" },
                        { v: `${count}名`, l: "支援者" },
                        { v: `¥${goal.toLocaleString()}`, l: "目標金額" },
                      ].map(({ v, l }) => (
                        <div key={l} style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1a3a5c" }}>{v}</div>
                          <div style={{ fontSize: "0.7rem", color: "#888" }}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {/* 説明文 */}
                    {project.description && (
                      <p style={{ color: "#555", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1rem",
                                  display: "-webkit-box", WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {project.description}
                      </p>
                    )}

                    {/* ボタン */}
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <Link href={`/projects/${project.id}`} style={{
                        flex: 1, padding: "0.7rem", textAlign: "center",
                        background: "#f0f4f8", color: "#1a3a5c",
                        borderRadius: "8px", textDecoration: "none",
                        fontSize: "0.9rem", fontWeight: "bold",
                      }}>
                        詳細を見る
                      </Link>
                      <Link href={`/support?project=${project.id}`} style={{
                        flex: 1, padding: "0.7rem", textAlign: "center",
                        background: "linear-gradient(135deg, #f0a500, #e55)",
                        color: "#fff", borderRadius: "8px", textDecoration: "none",
                        fontSize: "0.9rem", fontWeight: "bold",
                      }}>
                        ¥{minTier.toLocaleString()}〜 支援する
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 支援の流れ ── */}
      <section style={{ background: "#1a3a5c", padding: "3rem 2rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2 style={{ color: "#fff", textAlign: "center", fontSize: "1.6rem", marginBottom: "2rem" }}>
            ✨ 支援の流れ
          </h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}>
            {STEPS.map((step) => (
              <div key={step.title} style={{
                background: "rgba(255,255,255,0.1)", borderRadius: "12px",
                padding: "1.5rem 1rem", textAlign: "center", color: "#fff",
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{step.icon}</div>
                <div style={{ fontSize: "0.75rem", color: "#f0a500", fontWeight: "bold", marginBottom: "0.25rem" }}>{step.title}</div>
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{step.label}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── フッター ── */}
      <footer style={{
        background: "#0f2233", color: "#aaa",
        padding: "2rem", textAlign: "center",
      }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⛅ CloudFan</div>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>北海道の部活動を応援するクラウドファンディング</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
          <Link href="/admin" style={{ color: "#aaa", textDecoration: "none" }}>管理画面</Link>
          <span>|</span>
          <a href="mailto:narabadocf@gmail.com" style={{ color: "#aaa", textDecoration: "none" }}>お問い合わせ</a>
        </div>
        <p style={{ margin: 0, fontSize: "0.8rem" }}>© 2026 CloudFan. All rights reserved.</p>
      </footer>
    </div>
  );
}
