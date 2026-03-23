"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProjectEditForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get("id");
  const isEdit = !!idParam;

  const [form, setForm] = useState({
    school: "", club: "", title: "", description: "", story: "",
    goal: 500000, deadline: "", region: "北海道",
    youtube_url: "", images: ["", "", ""],
    status: "draft" as "active" | "draft" | "completed",
  });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !idParam) return;
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", Number(idParam))
        .single();
      if (error || !data) {
        setError("プロジェクトデータの取得に失敗しました");
      } else {
        setForm({
          school:      data.school      ?? "",
          club:        data.club        ?? "",
          title:       data.title       ?? "",
          description: data.description ?? "",
          story:       data.story       ?? "",
          goal:        data.goal        ?? 500000,
          deadline:    data.deadline    ?? "",
          region:      data.region      ?? "北海道",
          youtube_url: data.youtube_url ?? "",
          images:      Array.isArray(data.images)
                         ? [...data.images, "", "", ""].slice(0, 3)
                         : ["", "", ""],
          status:      data.status      ?? "draft",
        });
      }
      setLoading(false);
    })();
  }, [idParam, isEdit]);

  const set = (key: string, val: unknown) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.school.trim())   return setError("学校名を入力してください");
    if (!form.club.trim())     return setError("部活名を入力してください");
    if (!form.title.trim())    return setError("タイトルを入力してください");
    if (!form.deadline.trim()) return setError("締切日を入力してください");
    setSaving(true);
    try {
      const images = form.images.filter(Boolean);
      const payload = { ...form, images };
      let dbError;
      if (isEdit && idParam) {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", Number(idParam));
        dbError = error;
      } else {
        const { error } = await supabase
          .from("projects")
          .insert(payload);
        dbError = error;
      }
      if (dbError) throw new Error(dbError.message);
      router.push("/admin");
    } catch (err: unknown) {
      setError((err as Error).message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #d0d8e8",
    borderRadius: "8px", fontSize: "0.95rem", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#1a3a5c", fontWeight: 700,
    marginBottom: "0.4rem", fontSize: "0.85rem",
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
                  height: "60vh", color: "#1a3a5c", fontSize: "1.1rem" }}>
      読み込み中...
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fa", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#888", fontSize: "0.9rem",
          textDecoration: "none", display: "inline-flex", alignItems: "center",
          gap: "0.3rem", marginBottom: "1rem" }}>
          ← 管理画面に戻る
        </Link>
        <h1 style={{ color: "#1a3a5c", fontWeight: 900, fontSize: "1.6rem", marginBottom: "0.25rem" }}>
          {isEdit ? "✏️ プロジェクト編集" : "＋ 新規プロジェクト作成"}
        </h1>
        <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
          {isEdit ? "プロジェクト情報を編集します（Supabase に保存）" : "新しいクラウドファンディングを作成します"}
        </p>
        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #f5c0c0",
            borderRadius: "8px", padding: "1rem", marginBottom: "1rem",
            color: "#c0392b", fontSize: "0.9rem" }}>
            ⚠️ {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* 基本情報 */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem",
            marginBottom: "1.5rem", border: "1px solid #e0e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h2 style={{ color: "#1a3a5c", fontWeight: 900, marginTop: 0,
              marginBottom: "1.25rem", fontSize: "1.1rem" }}>📋 基本情報</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>学校名 <span style={{ color: "#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.school}
                  onChange={e => set("school", e.target.value)}
                  placeholder="北星学園女子中学高等学校" />
              </div>
              <div>
                <label style={labelStyle}>部活名 <span style={{ color: "#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.club}
                  onChange={e => set("club", e.target.value)}
                  placeholder="バドミントン部" />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>タイトル <span style={{ color: "#e74c3c" }}>*</span></label>
              <input style={inputStyle} value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="例：41年ぶりの全道優勝を目指す！" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>短い説明文</label>
              <input style={inputStyle} value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="100文字以内で概要を入力" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>目標金額（円）<span style={{ color: "#e74c3c" }}>*</span></label>
                <input style={inputStyle} type="number" value={form.goal}
                  onChange={e => set("goal", Number(e.target.value))} min={1000} />
              </div>
              <div>
                <label style={labelStyle}>締切日 <span style={{ color: "#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.deadline}
                  onChange={e => set("deadline", e.target.value)}
                  placeholder="2026年5月7日" />
              </div>
              <div>
                <label style={labelStyle}>ステータス</label>
                <select style={inputStyle} value={form.status}
                  onChange={e => set("status", e.target.value)}>
                  <option value="draft">下書き</option>
                  <option value="active">募集中</option>
                  <option value="completed">終了</option>
                </select>
              </div>
            </div>
          </div>
          {/* ストーリー */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem",
            marginBottom: "1.5rem", border: "1px solid #e0e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h2 style={{ color: "#1a3a5c", fontWeight: 900, marginTop: 0,
              marginBottom: "1.25rem", fontSize: "1.1rem" }}>📖 ストーリー</h2>
            <textarea
              style={{ ...inputStyle, minHeight: "180px", resize: "vertical" }}
              value={form.story}
              onChange={e => set("story", e.target.value)}
              placeholder="プロジェクトの背景・支援金の使い道などを記載" />
          </div>
          {/* メディア */}
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem",
            marginBottom: "1.5rem", border: "1px solid #e0e8f0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h2 style={{ color: "#1a3a5c", fontWeight: 900, marginTop: 0,
              marginBottom: "0.5rem", fontSize: "1.1rem" }}>🖼️ メディア</h2>
            <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              画像URL（Google ドライブ共有リンク等）を貼り付けてください
            </p>
            {form.images.map((img, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <label style={labelStyle}>写真 {i + 1}{i === 0 ? "（メイン画像）" : ""}</label>
                <input style={inputStyle} value={img}
                  onChange={e => {
                    const imgs = [...form.images];
                    imgs[i] = e.target.value;
                    set("images", imgs);
                  }}
                  placeholder="https://..." />
              </div>
            ))}
            <div style={{ marginTop: "1rem" }}>
              <label style={labelStyle}>YouTube 動画URL（任意）</label>
              <input style={inputStyle} value={form.youtube_url}
                onChange={e => set("youtube_url", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." />
            </div>
          </div>
          {/* ボタン */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: "1rem",
              background: saving ? "#ccc" : "#d4af37",
              color: "#0a1628", border: "none", borderRadius: "10px",
              fontSize: "1.1rem", fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
              {saving ? "⏳ 保存中..." : isEdit ? "💾 変更を保存" : "✅ プロジェクトを作成"}
            </button>
            <Link href="/admin" style={{
              padding: "1rem 1.5rem", background: "#f0f4fa",
              color: "#1a3a5c", border: "1px solid #ccd6e8",
              borderRadius: "10px", fontWeight: 700,
              textDecoration: "none", display: "inline-flex", alignItems: "center",
            }}>
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
