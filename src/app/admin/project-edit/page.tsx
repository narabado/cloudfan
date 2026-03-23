"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// =============================================
// Supabase クライアント初期化
// =============================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================
// 型定義
// =============================================
interface Tier {
  name: string;
  amount: number;
  description: string;
}

interface ProjectForm {
  school: string;
  club: string;
  title: string;
  description: string;
  story: string;
  goal: number;
  deadline: string;
  region: string;
  youtube_url: string;
  images: string[];
  tiers: Tier[];
  status: string;
}

// =============================================
// デフォルト値
// =============================================
const DEFAULT_FORM: ProjectForm = {
  school: "",
  club: "",
  title: "",
  description: "",
  story: "",
  goal: 500000,
  deadline: "",
  region: "",
  youtube_url: "",
  images: [],
  tiers: [
    { name: "ブロンズ", amount: 1000, description: "お礼メール＋活動報告レポート送付" },
    { name: "シルバー", amount: 3000, description: "上記＋クラブオリジナルステッカー" },
    { name: "ゴールド", amount: 10000, description: "上記＋選手からの直筆サイン色紙" },
    { name: "プラチナ", amount: 30000, description: "上記＋練習見学招待＋記念写真撮影" },
    { name: "レジェンド", amount: 100000, description: "上記＋スポンサー名をユニフォームに掲載" },
  ],
  status: "募集中",
};

// =============================================
// メインコンポーネント
// =============================================
export default function ProjectEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");
  const isNew = !projectId || projectId === "新規";

  const [form, setForm] = useState<ProjectForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =============================================
  // 既存プロジェクトを読み込む
  // =============================================
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase
        .from("crowdfunding_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error || !data) {
        setMessage("プロジェクトの読み込みに失敗しました");
        setLoading(false);
        return;
      }

      setForm({
        school: data.school ?? "",
        club: data.club ?? "",
        title: data.title ?? "",
        description: data.description ?? "",
        story: data.story ?? "",
        goal: data.goal ?? 500000,
        deadline: data.deadline ?? "",
        region: data.region ?? "",
        youtube_url: data.youtube_url ?? "",
        images: Array.isArray(data.images) ? data.images : [],
        tiers: Array.isArray(data.tiers) ? data.tiers : DEFAULT_FORM.tiers,
        status: data.status ?? "募集中",
      });
      setLoading(false);
    })();
  }, [projectId, isNew]);

  // =============================================
  // 画像を Supabase Storage にアップロード
  // =============================================
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("project-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
      console.error("Upload error:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);
    return urlData?.publicUrl ?? null;
  };

  // =============================================
  // 複数ファイルの処理
  // =============================================
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const url = await uploadImage(file);
      if (url) newUrls.push(url);
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newUrls] }));
    setUploading(false);
  };

  // =============================================
  // ドラッグ＆ドロップ
  // =============================================
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleImageFiles(e.dataTransfer.files);
  };

  // =============================================
  // 画像を削除
  // =============================================
  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // =============================================
  // ティア更新
  // =============================================
  const updateTier = (index: number, field: keyof Tier, value: string | number) => {
    setForm((prev) => {
      const tiers = [...prev.tiers];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...prev, tiers };
    });
  };

  const addTier = () => {
    setForm((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { name: "", amount: 0, description: "" }],
    }));
  };

  const removeTier = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  // =============================================
  // 保存（INSERT or UPDATE）
  // =============================================
  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const payload = { ...form };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("crowdfunding_projects").insert([payload]));
    } else {
      ({ error } = await supabase
        .from("crowdfunding_projects")
        .update(payload)
        .eq("id", projectId));
    }

    setSaving(false);
    if (error) {
      setMessage(`保存に失敗しました: ${error.message}`);
    } else {
      setMessage("✅ 保存しました");
      setTimeout(() => router.push("/admin"), 1500);
    }
  };

  // =============================================
  // UI 共通スタイル
  // =============================================
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  // =============================================
  // レンダリング
  // =============================================
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", padding: "32px 16px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push("/admin")}
            style={{ background: "none", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 14 }}
          >
            ← 管理画面に戻る
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            {isNew ? "新規プロジェクト作成" : "プロジェクト編集"}
          </h1>
        </div>

        {/* メッセージ */}
        {message && (
          <div style={{ padding: 16, borderRadius: 8, marginBottom: 24, background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2", color: message.startsWith("✅") ? "#065f46" : "#991b1b" }}>
            {message}
          </div>
        )}

        {/* 基本情報 */}
        <Section title="基本情報">
          <Field label="学校名" required>
            <input style={inputStyle} value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} placeholder="例：北星学園女子中学" />
          </Field>
          <Field label="部活動名" required>
            <input style={inputStyle} value={form.club} onChange={(e) => setForm({ ...form, club: e.target.value })} placeholder="例：バドミントン部" />
          </Field>
          <Field label="プロジェクトタイトル" required>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：全道大会出場を目指して！" />
          </Field>
          <Field label="地域">
            <input style={inputStyle} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="例：北海道札幌市" />
          </Field>
          <Field label="短い説明文（カード表示）" required>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="例：春の全道大会出場を目指す..." />
          </Field>
        </Section>

        {/* 詳細・動画 */}
        <Section title="詳細・動画">
          <Field label="詳細ストーリー（詳細ページに表示）">
            <textarea style={{ ...inputStyle, minHeight: 160, resize: "vertical" }} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="チームの背景や想いを書いてください..." />
          </Field>
          <Field label="YouTube URL（任意）">
            <input style={inputStyle} value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
        </Section>

        {/* 目標・期間 */}
        <Section title="目標・期間">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="目標金額（円）" required>
              <input style={inputStyle} type="number" value={form.goal} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })} />
            </Field>
            <Field label="募集終了日" required>
              <input style={inputStyle} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </Field>
          </div>
          <Field label="ステータス">
            <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="募集中">募集中</option>
              <option value="達成">達成</option>
              <option value="終了">終了</option>
              <option value="draft">下書き</option>
            </select>
          </Field>
        </Section>

        {/* 画像アップロード */}
        <Section title="プロジェクト画像">
          {/* ドラッグ＆ドロップエリア */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#2563eb" : "#d1d5db"}`,
              borderRadius: 12,
              padding: "32px 16px",
              textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "#eff6ff" : "#fafafa",
              transition: "all 0.2s",
              marginBottom: 16,
            }}
          >
            {uploading ? (
              <p style={{ color: "#6b7280", margin: 0 }}>⏳ アップロード中...</p>
            ) : (
              <>
                <p style={{ fontSize: 32, margin: "0 0 8px" }}>🖼️</p>
                <p style={{ color: "#374151", fontWeight: 600, margin: "0 0 4px" }}>ここに画像をドラッグ＆ドロップ</p>
                <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>またはクリックしてファイルを選択</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleImageFiles(e.target.files)}
          />

          {/* プレビュー */}
          {form.images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {form.images.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  {i === 0 && (
                    <span style={{ position: "absolute", top: 6, left: 6, background: "#2563eb", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, zIndex: 1 }}>
                      メイン
                    </span>
                  )}
                  <img src={url} alt={`画像${i + 1}`} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  <button
                    onClick={() => removeImage(i)}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, lineHeight: "24px", textAlign: "center", padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 支援ティア */}
        <Section title="支援ティア設定">
          {form.tiers.map((tier, i) => (
            <div key={i} style={{ background: "#f3f4f6", borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: "#374151" }}>ティア {i + 1}</span>
                {form.tiers.length > 1 && (
                  <button onClick={() => removeTier(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                    削除
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Field label="ティア名">
                  <input style={inputStyle} value={tier.name} onChange={(e) => updateTier(i, "name", e.target.value)} placeholder="例：ブロンズ" />
                </Field>
                <Field label="金額（円）">
                  <input style={inputStyle} type="number" value={tier.amount} onChange={(e) => updateTier(i, "amount", Number(e.target.value))} />
                </Field>
              </div>
              <Field label="説明">
                <input style={inputStyle} value={tier.description} onChange={(e) => updateTier(i, "description", e.target.value)} placeholder="例：お礼メール＋活動報告レポート" />
              </Field>
            </div>
          ))}
          <button onClick={addTier} style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600, width: "100%" }}>
            ＋ ティアを追加
          </button>
        </Section>

        {/* 保存ボタン */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 32 }}>
          <button
            onClick={() => router.push("/admin")}
            style={{ padding: "12px 24px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 15 }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "12px 32px", background: saving ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15 }}
          >
            {saving ? "保存中..." : isNew ? "作成する" : "保存する"}
          </button>
        </div>

      </div>
    </div>
  );
}

// =============================================
// 補助コンポーネント
// =============================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f", marginBottom: 20, paddingBottom: 10, borderBottom: "2px solid #e5e7eb" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
