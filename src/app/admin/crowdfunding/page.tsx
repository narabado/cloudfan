"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type FormData = {
  school: string;
  club: string;
  title: string;
  description: string;
  goal_amount: number;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "ended";
  youtube_url: string;
  story: string;
};

const statusLabels = { draft: "下書き", active: "進行中", ended: "終了" };
const statusColors = { draft: "#888", active: "#22c55e", ended: "#ef4444" };

export default function CrowdfundingAdminPage() {
  const [form, setForm] = useState<FormData>({
    school: "", club: "", title: "", description: "",
    goal_amount: 500000, start_date: "", end_date: "",
    status: "draft", youtube_url: "", story: "",
  });

  // 画像アップロード関連
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 画像ファイル選択
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    setImageFiles(prev => [...prev, ...files]);
    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  };

  // 画像削除
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Supabase Storageへアップロード（Phase 5）
  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("project-images")
        .upload(fileName, file, { upsert: true });
      if (error) {
        console.error("画像アップロードエラー:", error);
        continue;
      }
      const { data } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!form.goal_amount) {
      alert("目標金額は必須です");
      return;
    }
    setUploading(true);
    try {
      const imageUrls = imageFiles.length > 0 ? await uploadImages() : [];
      console.log("アップロード済み画像URL:", imageUrls);
      alert(`Phase 5でSupabaseへの保存を実装予定です\n\n画像${imageUrls.length}枚のURLを取得しました`);
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", fontSize: 14,
    boxSizing: "border-box", background: "#fff", color: "#0a1628",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: "bold", color: "#0a1628",
    marginBottom: 6, display: "block",
  };
  const sectionStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 12, padding: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,.08)", marginBottom: 24,
  };

  return (
    <div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>
      <header style={{
        background: "#0a1628", color: "#fff", padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "3px solid #d4af37",
      }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>
          🏸 新規クラウドファンディング登録
        </h1>
        <a href="/admin" style={{ color: "#d4af37", fontSize: 14 }}>← 管理画面に戻る</a>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

        {/* 基本情報 */}
        <div style={sectionStyle}>
          <h2 style={{ margin: "0 0 20px", color: "#0a1628", borderBottom: "2px solid #d4af37", paddingBottom: 8 }}>
            📋 基本情報
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>学校名</label>
              <input style={inputStyle} value={form.school} placeholder="例：北星学園女子中学高等学校"
                onChange={e => handleChange("school", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>部活名</label>
              <input style={inputStyle} value={form.club} placeholder="例：バドミントン部"
                onChange={e => handleChange("club", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>タイトル</label>
            <input style={inputStyle} value={form.title} placeholder="プロジェクトのタイトル"
              onChange={e => handleChange("title", e.target.value)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>短い説明文</label>
            <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={form.description}
              placeholder="プロジェクトの概要"
              onChange={e => handleChange("description", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>目標金額（円）<span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} type="number" value={form.goal_amount}
                onChange={e => handleChange("goal_amount", Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>開始日</label>
              <input style={inputStyle} type="date" value={form.start_date}
                onChange={e => handleChange("start_date", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>終了日</label>
              <input style={inputStyle} type="date" value={form.end_date}
                onChange={e => handleChange("end_date", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>ステータス</label>
            <div style={{ display: "flex", gap: 12 }}>
              {(["draft", "active", "ended"] as const).map(s => (
                <button key={s} onClick={() => handleChange("status", s)}
                  style={{
                    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontWeight: "bold", fontSize: 14,
                    background: form.status === s ? statusColors[s] : "#e2e8f0",
                    color: form.status === s ? "#fff" : "#555",
                  }}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 画像アップロード */}
        <div style={sectionStyle}>
          <h2 style={{ margin: "0 0 20px", color: "#0a1628", borderBottom: "2px solid #d4af37", paddingBottom: 8 }}>
            🖼️ 画像
          </h2>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>
            複数枚選択できます。JPG・PNG・WebP対応。
          </p>

          {/* ファイル選択ボタン */}
          <label style={{
            display: "inline-block", padding: "10px 24px", background: "#0a1628",
            color: "#d4af37", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 14,
          }}>
            📁 画像を選択する
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />
          </label>

          {/* プレビュー */}
          {imagePreviews.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                選択済み：{imagePreviews.length}枚
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {imagePreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt={`preview-${i}`}
                      style={{
                        width: 120, height: 90, objectFit: "cover",
                        borderRadius: 8, border: "2px solid #d4af37",
                      }}
                    />
                    <button
                      onClick={() => removeImage(i)}
                      style={{
                        position: "absolute", top: -8, right: -8,
                        background: "#ef4444", color: "#fff",
                        border: "none", borderRadius: "50%",
                        width: 24, height: 24, cursor: "pointer",
                        fontSize: 14, lineHeight: "24px", textAlign: "center",
                        fontWeight: "bold",
                      }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* YouTube・ストーリー */}
        <div style={sectionStyle}>
          <h2 style={{ margin: "0 0 20px", color: "#0a1628", borderBottom: "2px solid #d4af37", paddingBottom: 8 }}>
            🎬 動画・ストーリー
          </h2>
          <div>
            <label style={labelStyle}>YouTube URL</label>
            <input style={inputStyle} placeholder="https://www.youtube.com/watch?v=..."
              value={form.youtube_url}
              onChange={e => handleChange("youtube_url", e.target.value)} />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>ストーリー（本文）</label>
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>
              「▼セクション名」で区切ると見出しに変換されます
            </p>
            <textarea
              style={{ ...inputStyle, height: 200, resize: "vertical", fontFamily: "monospace", lineHeight: 1.7 }}
              value={form.story}
              placeholder={"▼クラブについて\n説明文...\n\n▼目標\n説明文..."}
              onChange={e => handleChange("story", e.target.value)}
            />
          </div>
        </div>

        {/* 保存ボタン */}
        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
          <a href="/admin" style={{
            padding: "12px 24px", background: "#888", color: "#fff",
            borderRadius: 8, textDecoration: "none", fontWeight: "bold",
          }}>
            キャンセル
          </a>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              padding: "12px 32px",
              background: uploading ? "#aaa" : "#d4af37",
              color: "#0a1628", border: "none", borderRadius: 8,
              cursor: uploading ? "not-allowed" : "pointer",
              fontWeight: "bold", fontSize: 16,
            }}>
            {uploading ? "アップロード中..." : "💾 登録する（Phase 5）"}
          </button>
        </div>
      </div>
    </div>
  );
}
