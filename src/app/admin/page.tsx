"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Supporter = {
  id: string; name: string; email: string; tier: string;
  units: number; total_amount: number; transfer_code: string;
  status: string; project_title: string; message: string; created_at: string;
};
type Project = Record<string, any>;

const STATIC_PROJECTS: Project[] = [{
  id: 1,
  title: "41年ぶりの全道優勝！北星学園女子バドミントン部を応援しよう",
  school: "北星学園女子中学高等学校", club: "バドミントン部",
  goal_amount: 500000, current_amount: 0, supporter_count: 0,
  status: "募集中", deadline: "2026-05-07",
}];

const tierColor: Record<string, string> = {
  ブロンズ: "#cd7f32", シルバー: "#aaa", ゴールド: "#d4af37",
  プラチナ: "#5be", レジェンド: "#e55",
};

function fiscalYear(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth();
  const y = d.getFullYear();
  return m >= 3 ? `${y}年度` : `${y - 1}年度`;
}

export default function AdminPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "supporters" | "projects" | "ranking">("dashboard");
  const [rankMode, setRankMode] = useState<"amount" | "yearly">("amount");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: sData, error: sErr } = await supabase
      .from("supporters").select("*").order("created_at", { ascending: false });
    if (sErr) console.error("supporters取得エラー:", sErr);
    setSupporters((sData as Supporter[]) ?? []);

    const { data: pData, error: pErr } = await supabase.from("プロジェクト").select("*");
    if (pErr || !pData || pData.length === 0) setProjects(STATIC_PROJECTS);
    else setProjects(pData as Project[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const approveSupporter = async (id: string) => {
    await supabase.from("supporters").update({ status: "approved" }).eq("id", id);
    fetchData();
  };
  const rejectSupporter = async (id: string) => {
    await supabase.from("supporters").update({ status: "rejected" }).eq("id", id);
    fetchData();
  };
  const revokeSupporter = async (id: string) => {
    if (!confirm("承認を取り消しますか？")) return;
    await supabase.from("supporters").update({ status: "pending" }).eq("id", id);
    fetchData();
  };

  const totalAmount = supporters.reduce((s, x) => s + (x.total_amount || 0), 0);
  const approvedAmount = supporters.filter(x => x.status === "approved")
    .reduce((s, x) => s + (x.total_amount || 0), 0);
  const pendingCount = supporters.filter(x => x.status === "pending").length;
  const amountRanking = [...supporters]
    .filter(x => x.status === "approved")
    .sort((a, b) => b.total_amount - a.total_amount);

  const yearlyGroups: Record<string, Supporter[]> = {};
  supporters.filter(x => x.status === "approved").forEach(x => {
    const fy = fiscalYear(x.created_at);
    if (!yearlyGroups[fy]) yearlyGroups[fy] = [];
    yearlyGroups[fy].push(x);
  });
  Object.values(yearlyGroups).forEach(arr =>
    arr.sort((a, b) => b.total_amount - a.total_amount)
  );

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      pending: ["#ff9800", "審査中"],
      approved: ["#22c55e", "承認済"],
      rejected: ["#ef4444", "却下"],
    };
    const [color, label] = map[status] ?? ["#999", status];
    return (
      <span style={{
        background: color, color: "#fff", borderRadius: 12,
        padding: "2px 10px", fontSize: 12, fontWeight: "bold",
      }}>
        {label}
      </span>
    );
  };

  const ActionButtons = ({ s }: { s: Supporter }) => (
    <div style={{ display: "flex", gap: 4 }}>
      {s.status === "pending" && (
        <>
          <button onClick={() => approveSupporter(s.id)} style={btnStyle("#22c55e")}>承認</button>
          <button onClick={() => rejectSupporter(s.id)} style={btnStyle("#ef4444")}>却下</button>
        </>
      )}
      {s.status === "approved" && (
        <button onClick={() => revokeSupporter(s.id)} style={btnStyle("#888")}>取消</button>
      )}
    </div>
  );

  const tabs = [
    { id: "dashboard" as const, label: "📊 ダッシュボード" },
    { id: "supporters" as const, label: "👥 支援者管理" },
    { id: "projects" as const, label: "📁 プロジェクト管理" },
    { id: "ranking" as const, label: "🏆 ランキング" },
  ];

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>
      <header style={{
        background: "#0a1628", color: "#fff", padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "3px solid #d4af37",
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>
          🏸 BADMINTON SUPPORT HOKKAIDO 管理画面
        </h1>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/" style={{ color: "#d4af37", fontSize: 14 }}>← サイトへ戻る</a>
          <a href="/admin/crowdfunding" style={{ color: "#d4af37", fontSize: 14 }}>＋ 新規登録</a>
        </div>
      </header>

      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        display: "flex", padding: "0 24px",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: 14, fontWeight: activeTab === t.id ? "bold" : "normal",
              color: activeTab === t.id ? "#d4af37" : "#555",
              borderBottom: activeTab === t.id ? "3px solid #d4af37" : "3px solid transparent",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#888" }}>読み込み中...</div>
        )}

        {/* ダッシュボード */}
        {!loading && activeTab === "dashboard" && (
          <div>
            <h2 style={{ marginBottom: 24, color: "#0a1628" }}>ダッシュボード</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { label: "総支援金額", value: `¥${totalAmount.toLocaleString()}`, color: "#d4af37" },
                { label: "承認済金額", value: `¥${approvedAmount.toLocaleString()}`, color: "#22c55e" },
                { label: "審査中", value: `${pendingCount}件`, color: "#ff9800" },
                { label: "支援者数", value: `${supporters.length}名`, color: "#5be" },
              ].map(c => (
                <div key={c.label} style={{
                  background: "#fff", borderRadius: 12, padding: 24,
                  boxShadow: "0 2px 8px rgba(0,0,0,.08)", borderTop: `4px solid ${c.color}`,
                }}>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>{c.label}</div>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 支援者管理 */}
        {!loading && activeTab === "supporters" && (
          <div>
            <h2 style={{ marginBottom: 24, color: "#0a1628" }}>支援者管理</h2>
            {supporters.length === 0 ? (
              <p style={{ color: "#888" }}>支援者データがありません</p>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#0a1628", color: "#fff" }}>
                    <tr>
                      {["名前", "メール", "ティア", "口数", "金額", "振替コード", "ステータス", "登録日", "操作"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supporters.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td style={{ padding: "12px 16px", fontSize: 14 }}>{s.name}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>{s.email}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: tierColor[s.tier] ?? "#333", fontWeight: "bold", fontSize: 13 }}>{s.tier}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14 }}>{s.units}</td>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: "bold" }}>
                          ¥{(s.total_amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "monospace" }}>{s.transfer_code}</td>
                        <td style={{ padding: "12px 16px" }}>{statusBadge(s.status)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#888" }}>
                          {new Date(s.created_at).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding: "12px 16px" }}><ActionButtons s={s} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* プロジェクト管理 */}
        {!loading && activeTab === "projects" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <a href="/admin/crowdfunding" style={{
                background: "#d4af37", color: "#0a1628", padding: "10px 20px",
                borderRadius: 8, textDecoration: "none", fontWeight: "bold", fontSize: 14,
                display: "inline-block", marginBottom: 16,
              }}>
                ＋ 新規クラウドファンディング登録
              </a>
              <h2 style={{ margin: 0, color: "#0a1628" }}>プロジェクト管理</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              {projects.map(p => (
                <div key={p.id} style={{
                  background: "#fff", borderRadius: 12, padding: 24,
                  boxShadow: "0 2px 8px rgba(0,0,0,.08)", borderTop: "4px solid #d4af37",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ background: "#0a1628", color: "#d4af37", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>
                      {p.status ?? "募集中"}
                    </span>
                    <a href={`/admin/project-edit?id=${p.id}`} style={{ color: "#5be", fontSize: 13, textDecoration: "none" }}>✏️ 編集</a>
                  </div>
                  <h3 style={{ margin: "8px 0", fontSize: 15, color: "#0a1628", lineHeight: 1.4 }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: "#666", margin: "4px 0" }}>{p.school} {p.club}</p>
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ textAlign: "center", background: "#f5f7fa", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 11, color: "#888" }}>目標金額</div>
                      <div style={{ fontWeight: "bold", color: "#0a1628" }}>¥{(p.goal_amount || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: "center", background: "#f5f7fa", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: 11, color: "#888" }}>支援者数</div>
                      <div style={{ fontWeight: "bold", color: "#0a1628" }}>{p.supporter_count ?? 0}名</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ランキング */}
        {!loading && activeTab === "ranking" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, color: "#0a1628" }}>ランキング</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setRankMode("amount")} style={btnStyle(rankMode === "amount" ? "#d4af37" : "#888")}>💰 金額順</button>
                <button onClick={() => setRankMode("yearly")} style={btnStyle(rankMode === "yearly" ? "#d4af37" : "#888")}>📅 年度別</button>
              </div>
            </div>

            {rankMode === "amount" && (
              <div>
                {amountRanking.map((s, i) => (
                  <div key={s.id} style={{
                    background: "#fff", borderRadius: 12, padding: "16px 24px",
                    marginBottom: 8, boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                    display: "flex", alignItems: "center", gap: 16,
                  }}>
                    <span style={{ fontSize: 24 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}位`}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: tierColor[s.tier] ?? "#333" }}>{s.tier}</div>
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: 18, color: "#d4af37" }}>¥{(s.total_amount || 0).toLocaleString()}</div>
                  </div>
                ))}
                {amountRanking.length === 0 && <p style={{ color: "#888" }}>承認済み支援者がいません</p>}
              </div>
            )}

            {rankMode === "yearly" && (
              <div>
                {Object.entries(yearlyGroups).sort(([a], [b]) => b.localeCompare(a)).map(([fy, list]) => (
                  <div key={fy} style={{ marginBottom: 32 }}>
                    <h3 style={{ color: "#0a1628", borderBottom: "2px solid #d4af37", paddingBottom: 8, marginBottom: 16 }}>{fy}</h3>
                    {list.map((s, i) => (
                      <div key={s.id} style={{
                        background: "#fff", borderRadius: 12, padding: "14px 20px",
                        marginBottom: 6, boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                        display: "flex", alignItems: "center", gap: 16,
                      }}>
                        <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}位`}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "bold" }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: tierColor[s.tier] ?? "#333" }}>{s.tier}</div>
                        </div>
                        <div style={{ fontWeight: "bold", color: "#d4af37" }}>¥{(s.total_amount || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ))}
                {Object.keys(yearlyGroups).length === 0 && <p style={{ color: "#888" }}>承認済み支援者がいません</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return { padding: "5px 12px", background: bg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: "bold" };
}
