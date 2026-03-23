"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ==================== 型定義 ====================
interface Supporter {
  id: string;
  project_id: string;
  name: string;
  email: string;
  amount: number;
  tier_name: string;
  status: string;
  message: string | null;
  transfer_code: string | null;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  status: string;
  goal_amount: number;
  created_at: string;
}

// ==================== パスワード ====================
const ADMIN_PASSWORD = "NBD3890";

// ==================== ステータス判定ヘルパー ====================
const isApproved  = (s: string) => ["approved", "承認", "承認済"].includes(s);
const isPending   = (s: string) => ["pending", "未承認", "未処理", ""].includes(s);
const isRejected  = (s: string) => ["rejected", "却下"].includes(s);
const isCancelled = (s: string) => ["cancelled", "キャンセル"].includes(s);

const statusLabel = (s: string) => {
  if (isApproved(s))  return "✅ 承認済";
  if (isPending(s))   return "⏳ 未承認";
  if (isRejected(s))  return "❌ 却下";
  if (isCancelled(s)) return "🚫 取消";
  return s;
};

const statusColor = (s: string) => {
  if (isApproved(s))  return "#16a34a";
  if (isPending(s))   return "#d97706";
  if (isRejected(s))  return "#dc2626";
  if (isCancelled(s)) return "#6b7280";
  return "#374151";
};

// ==================== メインコンポーネント ====================
export default function AdminPage() {
  const router = useRouter();

  // ---- 認証 ----
  const [authed, setAuthed]     = useState(false);
  const [pwInput, setPwInput]   = useState("");
  const [pwError, setPwError]   = useState("");

  // ---- データ ----
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(false);

  // ---- UI ----
  const [tab,       setTab]       = useState<"supporters" | "projects">("supporters");
  const [filterPrj, setFilterPrj] = useState("all");
  const [filterSts, setFilterSts] = useState("all");

  // ---- セッション確認（マウント時）----
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_authed");
    if (saved === "true") {
      setAuthed(true);
    }
  }, []);

  // ---- 認証後にデータ取得 ----
  useEffect(() => {
    if (authed) fetchAll();
  }, [authed]);

  // ---- データ取得 ----
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: sup }, { data: prj }] = await Promise.all([
        supabase.from("supporters").select("*").order("created_at", { ascending: false }),
        supabase.from("crowdfunding_projects").select("*").order("created_at", { ascending: false }),
      ]);
      setSupporters(sup ?? []);
      setProjects(prj ?? []);
    } catch (e) {
      console.error("データ取得エラー:", e);
    } finally {
      setLoading(false);
    }
  };

  // ---- ログイン処理 ----
  const handleLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_authed", "true");
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("パスワードが違います");
    }
  };

  // ---- ログアウト ----
  const handleLogout = () => {
    sessionStorage.removeItem("admin_authed");
    setAuthed(false);
    setPwInput("");
  };

  // ---- ステータス更新 ----
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("supporters").update({ status }).eq("id", id);
    if (error) { alert("更新失敗: " + error.message); return; }
    await fetchAll();
  };

  // ==================== パスワード画面 ====================
  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "48px 40px",
          width: 360,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#1e3a5f" }}>
            管理者ページ
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}>
            パスワードを入力してください
          </p>

          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="パスワード"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: pwError ? "2px solid #dc2626" : "2px solid #d1d5db",
              borderRadius: 8,
              fontSize: 16,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            }}
            autoFocus
          />

          {pwError && (
            <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>
              {pwError}
            </p>
          )}

          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #1e3a5f, #2d6a4f)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // ==================== 管理画面（認証後）====================

  // 統計
  const approvedSupporters = supporters.filter(s => isApproved(s.status));
  const pendingSupporters  = supporters.filter(s => isPending(s.status));
  const totalAmount        = approvedSupporters.reduce((sum, s) => sum + (s.amount || 0), 0);

  // フィルター
  const filtered = supporters.filter(s => {
    const prjMatch = filterPrj === "all" || s.project_id === filterPrj;
    const stsMatch =
      filterSts === "all"       ? true :
      filterSts === "approved"  ? isApproved(s.status) :
      filterSts === "pending"   ? isPending(s.status)  :
      filterSts === "rejected"  ? isRejected(s.status) :
      filterSts === "cancelled" ? isCancelled(s.status) : true;
    return prjMatch && stsMatch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>

      {/* ヘッダー */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)",
        color: "#fff",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>⚙️ 管理者ダッシュボード</h1>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ログアウト
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, fontSize: 18, color: "#6b7280" }}>
            読み込み中...
          </div>
        ) : (
          <>
            {/* 統計カード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "総承認支援額", value: `¥${totalAmount.toLocaleString()}`, color: "#1e3a5f" },
                { label: "承認済支援者", value: `${approvedSupporters.length}名`, color: "#2d6a4f" },
                { label: "未承認支援者", value: `${pendingSupporters.length}名`, color: "#d97706" },
                { label: "プロジェクト数", value: `${projects.length}件`, color: "#7c3aed" },
              ].map((card) => (
                <div key={card.label} style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  borderLeft: `4px solid ${card.color}`,
                }}>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* タブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {(["supporters", "projects"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    background: tab === t ? "#1e3a5f" : "#e5e7eb",
                    color: tab === t ? "#fff" : "#374151",
                  }}
                >
                  {t === "supporters" ? "👥 支援者管理" : "📋 プロジェクト管理"}
                </button>
              ))}
            </div>

            {/* ===== 支援者タブ ===== */}
            {tab === "supporters" && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>

                {/* フィルター */}
                <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                  <select value={filterPrj} onChange={e => setFilterPrj(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                    <option value="all">すべてのプロジェクト</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <select value={filterSts} onChange={e => setFilterSts(e.target.value)}
                    style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                    <option value="all">すべてのステータス</option>
                    <option value="pending">⏳ 未承認</option>
                    <option value="approved">✅ 承認済</option>
                    <option value="rejected">❌ 却下</option>
                    <option value="cancelled">🚫 取消</option>
                  </select>
                </div>

                {/* テーブル */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        {["日時", "名前", "プロジェクト", "コース", "金額", "ステータス", "振込コード", "操作"].map(h => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>データがありません</td></tr>
                      ) : filtered.map(s => {
                        const prjName = projects.find(p => p.id === s.project_id)?.title ?? s.project_id;
                        return (
                          <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                              {new Date(s.created_at).toLocaleDateString("ja-JP")}
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.name}</td>
                            <td style={{ padding: "10px 12px", color: "#374151" }}>{prjName}</td>
                            <td style={{ padding: "10px 12px" }}>{s.tier_name}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e3a5f" }}>
                              ¥{(s.amount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#fff",
                                background: statusColor(s.status),
                              }}>
                                {statusLabel(s.status)}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>
                              {s.transfer_code ?? "-"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {!isApproved(s.status) && (
                                  <button onClick={() => updateStatus(s.id, "approved")}
                                    style={{ padding: "4px 10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                    承認
                                  </button>
                                )}
                                {!isRejected(s.status) && (
                                  <button onClick={() => updateStatus(s.id, "rejected")}
                                    style={{ padding: "4px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                    却下
                                  </button>
                                )}
                                {!isCancelled(s.status) && (
                                  <button onClick={() => { if (confirm("取り消しますか？")) updateStatus(s.id, "cancelled"); }}
                                    style={{ padding: "4px 10px", background: "#6b7280", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                    取消
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== プロジェクトタブ ===== */}
            {tab === "projects" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <button onClick={() => router.push("/admin/project-edit")}
                    style={{
                      padding: "10px 24px",
                      background: "linear-gradient(135deg, #1e3a5f, #2d6a4f)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                    }}>
                    ＋ 新規プロジェクト
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>{p.title}</h3>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#fff",
                          background: p.status === "募集中" ? "#2d6a4f" : "#6b7280",
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                        目標: ¥{(p.goal_amount || 0).toLocaleString()}
                      </div>
                      <button onClick={() => router.push(`/admin/project-edit?id=${p.id}`)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          background: "#f1f5f9",
                          border: "1px solid #d1d5db",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}>
                        ✏️ 編集
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}