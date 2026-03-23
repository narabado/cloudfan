"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
}

function isApproved(s: string) { return ["approved","承認","承認済"].includes(s); }
function isPending(s: string)  { return ["pending","未承認","未処理",""].includes(s); }
function isRejected(s: string) { return ["rejected","却下"].includes(s); }
function isCancelled(s: string){ return ["cancelled","キャンセル"].includes(s); }

export default function AdminPage() {
  const router = useRouter();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [projects,   setProjects]   = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("supporters");
  const [filterPrj,  setFilterPrj]  = useState("all");
  const [filterSts,  setFilterSts]  = useState("all");

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        supabase.from("supporters").select("*").order("created_at", { ascending: false }),
        supabase.from("crowdfunding_projects").select("*").order("created_at", { ascending: false }),
      ]);
      setSupporters(r1.data ?? []);
      setProjects(r2.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("supporters").update({ status }).eq("id", id);
    fetchAll();
  }

  const approved = supporters.filter(s => isApproved(s.status));
  const pending  = supporters.filter(s => isPending(s.status));
  const total    = approved.reduce((sum, s) => sum + (s.amount || 0), 0);

  const filtered = supporters.filter(s => {
    const mp = filterPrj === "all" || s.project_id === filterPrj;
    const ms = filterSts === "all"       ? true
             : filterSts === "approved"  ? isApproved(s.status)
             : filterSts === "pending"   ? isPending(s.status)
             : filterSts === "rejected"  ? isRejected(s.status)
             : filterSts === "cancelled" ? isCancelled(s.status)
             : true;
    return mp && ms;
  });

  const sLabel = (s: string) =>
    isApproved(s) ? "✅ 承認済" : isPending(s) ? "⏳ 未承認" :
    isRejected(s) ? "❌ 却下"   : isCancelled(s) ? "🚫 取消" : s;

  const sColor = (s: string) =>
    isApproved(s) ? "#16a34a" : isPending(s) ? "#d97706" :
    isRejected(s) ? "#dc2626" : "#6b7280";

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:18, color:"#6b7280" }}>
      読み込み中...
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background:"linear-gradient(135deg,#1e3a5f,#2d6a4f)",
        color:"#fff", padding:"16px 32px",
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ margin:0, fontSize:20, fontWeight:700 }}>🌤 CloudFan 管理画面</h1>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={() => router.push("/admin/project-edit")}
            style={{ padding:"8px 16px", background:"#f59e0b", color:"#fff",
              border:"none", borderRadius:8, cursor:"pointer", fontWeight:700 }}>
            ＋新規プロジェクト
          </button>
          <button onClick={() => router.push("/")}
            style={{ padding:"8px 16px", background:"rgba(255,255,255,0.2)",
              color:"#fff", border:"1px solid rgba(255,255,255,0.4)",
              borderRadius:8, cursor:"pointer" }}>
            サイトへ戻る
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 16px" }}>
        {/* 統計 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:32 }}>
          {[
            { label:"総支援金額（承認済）", value:`¥${total.toLocaleString()}`, color:"#1e3a5f" },
            { label:"全支援者数",          value:`${supporters.length}名`,      color:"#2d6a4f" },
            { label:"承認待ち",            value:`${pending.length}件`,         color:"#d97706" },
            { label:"プロジェクト数",       value:`${projects.length}件`,        color:"#7c3aed" },
          ].map(c => (
            <div key={c.label} style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
              boxShadow:"0 2px 8px rgba(0,0,0,0.08)", borderLeft:`4px solid ${c.color}` }}>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>{c.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* タブ */}
        <div style={{ display:"flex", gap:8, marginBottom:24 }}>
          {[["supporters","👥 支援者管理"],["projects","📋 プロジェクト管理"]].map(([k,v]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding:"10px 24px", borderRadius:8, border:"none", cursor:"pointer",
              fontWeight:700, fontSize:14,
              background: tab === k ? "#1e3a5f" : "#e5e7eb",
              color: tab === k ? "#fff" : "#374151",
            }}>{v}</button>
          ))}
        </div>

        {/* 支援者タブ */}
        {tab === "supporters" && (
          <div style={{ background:"#fff", borderRadius:12, padding:24,
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <select value={filterPrj} onChange={e => setFilterPrj(e.target.value)}
                style={{ padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13 }}>
                <option value="all">すべてのプロジェクト</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select value={filterSts} onChange={e => setFilterSts(e.target.value)}
                style={{ padding:"8px 12px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13 }}>
                <option value="all">すべて ({supporters.length})</option>
                <option value="pending">⏳ 未承認 ({pending.length})</option>
                <option value="approved">✅ 承認済 ({approved.length})</option>
                <option value="rejected">❌ 却下</option>
                <option value="cancelled">🚫 取消</option>
              </select>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f1f5f9" }}>
                    {["日時","プロジェクト","支援者","ティア","金額","振込コード","ステータス","操作"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left",
                        color:"#374151", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const prj = projects.find(p => p.id === s.project_id)?.title ?? "-";
                    return (
                      <tr key={s.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"10px 12px", color:"#6b7280", whiteSpace:"nowrap" }}>
                          {new Date(s.created_at).toLocaleDateString("ja-JP")}
                        </td>
                        <td style={{ padding:"10px 12px" }}>{prj}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ fontWeight:600 }}>{s.name}</div>
                          <div style={{ fontSize:11, color:"#9ca3af" }}>{s.email}</div>
                        </td>
                        <td style={{ padding:"10px 12px" }}>{s.tier_name}</td>
                        <td style={{ padding:"10px 12px", fontWeight:700, color:"#1e3a5f" }}>
                          ¥{(s.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding:"10px 12px", fontFamily:"monospace", color:"#dc2626" }}>
                          {s.transfer_code ?? "-"}
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:12, fontSize:12,
                            fontWeight:700, color:"#fff", background:sColor(s.status) }}>
                            {sLabel(s.status)}
                          </span>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {!isApproved(s.status) && (
                              <button onClick={() => updateStatus(s.id, "approved")}
                                style={{ padding:"4px 8px", background:"#16a34a", color:"#fff",
                                  border:"none", borderRadius:6, cursor:"pointer", fontSize:11 }}>
                                承認
                              </button>
                            )}
                            {!isRejected(s.status) && (
                              <button onClick={() => updateStatus(s.id, "rejected")}
                                style={{ padding:"4px 8px", background:"#dc2626", color:"#fff",
                                  border:"none", borderRadius:6, cursor:"pointer", fontSize:11 }}>
                                却下
                              </button>
                            )}
                            {!isCancelled(s.status) && (
                              <button onClick={() => updateStatus(s.id, "cancelled")}
                                style={{ padding:"4px 8px", background:"#6b7280", color:"#fff",
                                  border:"none", borderRadius:6, cursor:"pointer", fontSize:11 }}>
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

        {/* プロジェクトタブ */}
        {tab === "projects" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            {projects.map(p => (
              <div key={p.id} style={{ background:"#fff", borderRadius:12, padding:20,
                boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 style={{ margin:"0 0 8px", fontSize:15, color:"#1e3a5f" }}>{p.title}</h3>
                <div style={{ fontSize:13, color:"#6b7280", marginBottom:12 }}>
                  目標: ¥{(p.goal_amount || 0).toLocaleString()}
                </div>
                <button onClick={() => router.push(`/admin/project-edit?id=${p.id}`)}
                  style={{ width:"100%", padding:"8px", background:"#f1f5f9",
                    border:"1px solid #d1d5db", borderRadius:6, cursor:"pointer",
                    fontSize:13, fontWeight:600 }}>
                  ✏️ 編集
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
