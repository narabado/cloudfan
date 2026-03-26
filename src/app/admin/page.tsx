"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "NBD3890";
const SESSION_KEY = "admin_auth";

type Supporter = {
  id: string;
  project_id: string;
  name: string;
  email: string;
  total_amount: number;
  tier: string;
  status: string;
  message: string | null;
  transfer_code: string | null;
  created_at: string;
};

type Tier = {
  id: string;
  name: string;
  total_amount: number;
};

type Project = {
  id: string;
  title: string;
  status: string;
  goal_amount: number;
  created_at: string;
  tiers: Tier[] | null; // ← 追加
};

export default function AdminPage() {
  const router = useRouter();

  const [isAuth,    setIsAuth]    = useState(false);
  const [password,  setPassword]  = useState("");
  const [authError, setAuthError] = useState("");
  const [checking,  setChecking]  = useState(true);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "true";
    setIsAuth(ok);
    setChecking(false);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuth(true);
      setAuthError("");
    } else {
      setAuthError("パスワードが違います");
      setPassword("");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuth(false);
    router.push("/");
  };

  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"supporters" | "projects">("supporters");
  const [filterPrj,  setFilterPrj]  = useState("all");
  const [filterSts,  setFilterSts]  = useState("all");

  useEffect(() => {
    if (isAuth) fetchAll();
  }, [isAuth]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: sup }, { data: prj }] = await Promise.all([
      supabase.from("supporters").select("*").order("created_at", { ascending: false }),
      supabase.from("crowdfunding_projects").select("*").order("created_at", { ascending: false }),
    ]);
    setSupporters(sup ?? []);
    setProjects(prj ?? []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("supporters").update({ status }).eq("id", id);
    fetchAll();
  };

  // ── 支援者削除 ──────────────────────────────────────
  const deleteSupporter = async (id: string) => {
    if (!confirm("この支援者データを完全に削除しますか？\nこの操作は取り消せません。")) return;
    const { error } = await supabase.from("supporters").delete().eq("id", id);
    if (!error) {
      setSupporters(prev => prev.filter(s => s.id !== id));
    }
  };

  // ── 金額補完：amount=0 の場合ティアから取得 ─────────
  const resolveAmount = (s: Supporter): number => {
    if (s.total_amount && s.total_amount > 0) return s.total_amount;
    const prj = projects.find(p => p.id === s.project_id);
    if (prj?.tiers) {
      const tier = prj.tiers.find(t => t.name === s.tier);
      if (tier) return tier.amount;
    }
    return 0;
  };

  const isApproved  = (s: string) => ["approved",  "承認", "承認済み"].includes(s);
  const isPending   = (s: string) => ["pending",   "未承認", "未処理", ""].includes(s);
  const isRejected  = (s: string) => ["rejected",  "却下"].includes(s);
  const isCancelled = (s: string) => ["cancelled", "キャンセル", "取消"].includes(s);

  const statusLabel = (s: string) => {
    if (isApproved(s))  return "✅ 承認済み";
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

  const filtered = supporters.filter((s) => {
    const matchPrj = filterPrj === "all" || s.project_id === filterPrj;
    const matchSts =
      filterSts === "all"       ? true :
      filterSts === "approved"  ? isApproved(s.status) :
      filterSts === "pending"   ? isPending(s.status) :
      filterSts === "rejected"  ? isRejected(s.status) :
      filterSts === "cancelled" ? isCancelled(s.status) : true;
    return matchPrj && matchSts;
  });

  if (checking) return null;

  if (!isAuth) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0d1b2a 0%, #1a2e4a 50%, #1e4d8c 100%)",
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)", textAlign: "center",
      }}>
        <div style={{ marginBottom: 8 }}>
          <img src="/logo.png" alt="CloudFan" style={{ height: 48 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1a2e4a", marginBottom: 6 }}>
          CloudFan 管理
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32 }}>
          🔒 管理者専用エリアです
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          placeholder="パスワードを入力"
          style={{
            width: "100%", padding: "14px 18px", border: "2px solid #e2e8f0",
            borderRadius: 10, fontSize: 16, boxSizing: "border-box",
            outline: "none", textAlign: "center", letterSpacing: "0.1em", marginBottom: 16,
          }}
          autoFocus
        />
        {authError && (
          <div style={{ marginBottom: 14, padding: "10px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            {authError}
          </div>
        )}
        <button onClick={handleLogin} style={{
          width: "100%", padding: "14px 0",
          background: "linear-gradient(135deg, #1a2e4a, #2563eb)",
          color: "#fff", border: "none", borderRadius: 10,
          fontWeight: 800, fontSize: 16, cursor: "pointer",
          boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
        }}>
          🔑 ログイン
        </button>
        <p style={{ marginTop: 20, fontSize: 12, color: "#cbd5e1" }}>
          ブラウザを閉じると自動ログアウトします
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <p>読み込み中...</p>
    </div>
  );

  const approvedList = supporters.filter(s => isApproved(s.status));
  const pendingList  = supporters.filter(s => isPending(s.status));
  // ← resolveAmount で合計を正しく計算
  const totalAmount  = approvedList.reduce((sum, s) => sum + resolveAmount(s), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)", color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🏠 管理ダッシュボード</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/")} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
            ← サイトへ戻る
          </button>
          <button onClick={handleLogout} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        {/* サマリーカード */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "総支援金額",     value: `¥${totalAmount.toLocaleString()}`, color: "#1e3a5f" },
            { label: "承認済み支援者", value: `${approvedList.length}人`,         color: "#2d6a4f" },
            { label: "未承認支援者",   value: `${pendingList.length}人`,          color: "#d97706" },
            { label: "プロジェクト数", value: `${projects.length}件`,             color: "#7c3aed" },
          ].map(c => (
            <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderLeft: `4px solid ${c.color}` }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* タブ */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["supporters", "projects"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: tab === t ? "#1e3a5f" : "#e5e7eb", color: tab === t ? "#fff" : "#374151" }}>
              {t === "supporters" ? "👥 支援者の管理" : "📋 プロジェクト管理"}
            </button>
          ))}
        </div>

        {/* 支援者タブ */}
        {tab === "supporters" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <select value={filterPrj} onChange={e => setFilterPrj(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                <option value="all">すべてのプロジェクト</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select value={filterSts} onChange={e => setFilterSts(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                <option value="all">すべてのステータス</option>
                <option value="pending">⏳ 未承認</option>
                <option value="approved">✅ 承認済み</option>
                <option value="rejected">❌ 却下</option>
                <option value="cancelled">🚫 取消</option>
              </select>
            </div>
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
                    const displayAmount = resolveAmount(s); // ← 金額補完
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {new Date(s.created_at).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: "10px 12px" }}>{prjName}</td>
                        <td style={{ padding: "10px 12px" }}>{s.tier}</td>
                        {/* ← 金額を補完後の値で表示 */}
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e3a5f" }}>
                          ¥{displayAmount.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#fff", background: statusColor(s.status) }}>
                            {statusLabel(s.status)}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 12 }}>
                          {s.transfer_code ?? "-"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {!isApproved(s.status)  && (
                              <button onClick={() => updateStatus(s.id, "approved")}
                                style={{ padding: "4px 10px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                                承認
                              </button>
                            )}
                            {!isRejected(s.status)  && (
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
                            {/* ← 削除ボタン（新規追加） */}
                            <button onClick={() => deleteSupporter(s.id)}
                              style={{ padding: "4px 10px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                              🗑️
                            </button>
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

        {/* プロジェクトタブ */}
        {tab === "projects" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => router.push("/admin/project-edit")} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                ＋ 新規プロジェクト
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
              {projects.map(p => (
                <div key={p.id} style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>{p.title}</h3>
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: "#fff", background: p.status === "募集中" ? "#2d6a4f" : "#6b7280" }}>
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                    目標: ¥{(p.goal_amount || 0).toLocaleString()}
                  </div>
                  <button onClick={() => router.push(`/admin/project-edit?id=${p.id}`)} style={{ width: "100%", padding: "8px", background: "#f1f5f9", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    ✏️ 編集
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



