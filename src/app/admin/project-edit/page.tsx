"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Tier = {
  id: string;
  name: string;
  amount: number;
  description: string;
  max_supporters: number | null;
};

type ProjectForm = {
  title: string;
  description: string;
  goal_amount: number;
  status: string;
  image_url: string;
  deadline: string;
};

function ProjectEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [form, setForm] = useState<ProjectForm>({
    title: "",
    description: "",
    goal_amount: 0,
    status: "募集中",
    image_url: "",
    deadline: "",
  });
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crowdfunding_projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (data) {
      setForm({
        title: data.title ?? "",
        description: data.description ?? "",
        goal_amount: data.goal_amount ?? 0,
        status: data.status ?? "募集中",
        image_url: data.image_url ?? "",
        deadline: data.deadline ? data.deadline.slice(0, 10) : "",
      });
    }
    const { data: tierData } = await supabase
      .from("project_tiers")
      .select("*")
      .eq("project_id", projectId)
      .order("amount");
    setTiers(tierData ?? []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      if (projectId) {
        const { error } = await supabase
          .from("crowdfunding_projects")
          .update({ ...form })
          .eq("id", projectId);
        if (error) throw error;
        setMessage("✅ 保存しました");
      } else {
        const { data, error } = await supabase
          .from("crowdfunding_projects")
          .insert([{ ...form }])
          .select()
          .single();
        if (error) throw error;
        setMessage("✅ プロジェクトを作成しました");
        setTimeout(() => router.push(`/admin/project-edit?id=${data.id}`), 1000);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setMessage("❌ " + msg);
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setTiers([...tiers, { id: crypto.randomUUID(), name: "", amount: 0, description: "", max_supporters: null }]);
  };

  const updateTier = (index: number, field: keyof Tier, value: string | number | null) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const saveTiers = async () => {
    if (!projectId) { alert("先にプロジェクトを保存してください"); return; }
    setSaving(true);
    try {
      await supabase.from("project_tiers").delete().eq("project_id", projectId);
      if (tiers.length > 0) {
        const { error } = await supabase.from("project_tiers").insert(
          tiers.map((t) => ({ ...t, project_id: projectId }))
        );
        if (error) throw error;
      }
      setMessage("✅ コースを保存しました");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      setMessage("❌ " + msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)", color: "#fff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {projectId ? "✏️ プロジェクト編集" : "➕ 新規プロジェクト"}
        </h1>
        <button onClick={() => router.push("/admin")} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}>
          ← 管理画面へ戻る
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
        {message && (
          <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 24, background: message.startsWith("✅") ? "#dcfce7" : "#fee2e2", color: message.startsWith("✅") ? "#166534" : "#991b1b", fontWeight: 600 }}>
            {message}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>基本情報</h2>
          {[
            { label: "プロジェクト名", key: "title", type: "text" },
            { label: "目標金額 (¥)", key: "goal_amount", type: "number" },
            { label: "サムネイル画像URL", key: "image_url", type: "text" },
            { label: "締切日", key: "deadline", type: "date" },
          ].map(({ label, key, type }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
              <input
                type={type}
                value={String(form[key as keyof ProjectForm])}
                onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>ステータス</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 }}>
              <option value="募集中">募集中</option>
              <option value="終了">終了</option>
              <option value="準備中">準備中</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>説明文</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box", resize: "vertical" }}
            />
          </div>
          <button onClick={handleSave} disabled={saving} style={{ padding: "12px 32px", background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中..." : "💾 プロジェクトを保存"}
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>支援コース</h2>
            <button onClick={addTier} style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>＋ コース追加</button>
          </div>
          {tiers.map((tier, i) => (
            <div key={tier.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>コース名</label>
                  <input value={tier.name} onChange={(e) => updateTier(i, "name", e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>金額 (¥)</label>
                  <input type="number" value={tier.amount} onChange={(e) => updateTier(i, "amount", Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>説明</label>
                <input value={tier.description} onChange={(e) => updateTier(i, "description", e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => deleteTier(i)} style={{ padding: "6px 14px", background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>削除</button>
              </div>
            </div>
          ))}
          {tiers.length > 0 && (
            <button onClick={saveTiers} disabled={saving} style={{ padding: "12px 32px", background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
              {saving ? "保存中..." : "💾 コースを保存"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectEditPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><p>読み込み中...</p></div>}>
      <ProjectEditContent />
    </Suspense>
  );
}
