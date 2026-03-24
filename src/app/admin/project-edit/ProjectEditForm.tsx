"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Tier = { name: string; amount: number; description: string };

const DEFAULT_TIERS: Tier[] = [
  { name: "ブロンズ",   amount: 1000,   description: "お礼メール＋活動報告レポート送付" },
  { name: "シルバー",   amount: 3000,   description: "上記＋クラブオリジナルステッカー" },
  { name: "ゴールド",   amount: 10000,  description: "上記＋選手からの直筆サイン色紙" },
  { name: "プラチナ",   amount: 30000,  description: "上記＋練習見学招待＋記念写真撮影" },
  { name: "レジェンド", amount: 100000, description: "上記＋スポンサー名をユニフォームに掲載" },
];

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
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (!isEdit || !idParam) return;
    (async () => {
      const { data, error } = await supabase
        .from("crowdfunding_projects")
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
          images:      Array.isArray(data.images) ? [...data.images, "", "", ""].slice(0, 3) : ["", "", ""],
          status:      data.status ?? "draft",
        });
        if (Array.isArray(data.tiers) && data.tiers.length > 0) setTiers(data.tiers);
      }
      setLoading(false);
    })();
  }, [idParam, isEdit]);

  const set = (key: string, val: unknown) => setForm(f => ({ ...f, [key]: val }));
  const setTier = (i: number, key: keyof Tier, val: string | number) =>
    setTiers(ts => ts.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  const addTier = () => setTiers(ts => [...ts, { name: "", amount: 0, description: "" }]);
  const removeTier = (i: number) => setTiers(ts => ts.filter((_, idx) => idx !== i));

  const uploadImage = async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイル（PNG・JPG等）を選択してください");
      return;
    }
    setUploading(prev => ({ ...prev, [index]: true }));
    setError("");
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `projects/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("images")
        .getPublicUrl(path);
      const imgs = [...form.images];
      imgs[index] = publicUrl;
      set("images", imgs);
    } catch (e: unknown) {
      setError("画像アップロード失敗: " + (e as Error).message);
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
  };

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
      const payload = { ...form, images, tiers };
      let dbError;
      if (isEdit && idParam) {
        const { error } = await supabase.from("crowdfunding_projects").update(payload).eq("id", Number(idParam));
        dbError = error;
      } else {
        const { error } = await supabase.from("crowdfunding_projects").insert(payload);
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
    width: "100%", padding: "0.6rem 0.9rem", border: "1.5px solid #d0d8e8",
    borderRadius: "8px", fontSize: "0.9rem", outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#1a3a5c", fontWeight: 700,
    marginBottom: "0.35rem", fontSize: "0.82rem",
  };
  const cardStyle: React.CSSProperties = {
    background: "#fff", borderRadius: "12px", padding: "1.5rem",
    marginBottom: "1.5rem", border: "1px solid #e0e8f0",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"60vh", color:"#1a3a5c", fontSize:"1.1rem" }}>
      読み込み中...
    </div>
  );

  return (
    <main style={{ minHeight:"100vh", background:"#f5f7fa", padding:"2rem 1rem" }}>
      <div style={{ maxWidth:"760px", margin:"0 auto" }}>
        <Link href="/admin" style={{ color:"#888", fontSize:"0.9rem", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"0.3rem", marginBottom:"1rem" }}>
          ← 管理画面に戻る
        </Link>
        <h1 style={{ color:"#1a3a5c", fontWeight:900, fontSize:"1.6rem", marginBottom:"0.25rem" }}>
          {isEdit ? "✏️ プロジェクト編集" : "＋ 新規プロジェクト作成"}
        </h1>
        <p style={{ color:"#888", marginBottom:"2rem", fontSize:"0.9rem" }}>
          {isEdit ? "プロジェクト情報を編集します（Supabaseに保存）" : "新しいクラウドファンディングを作成します"}
        </p>
        {error && (
          <div style={{ background:"#fff0f0", border:"1px solid #f5c0c0", borderRadius:"8px", padding:"1rem", marginBottom:"1rem", color:"#c0392b", fontSize:"0.9rem" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* 基本情報 */}
          <div style={cardStyle}>
            <h2 style={{ color:"#1a3a5c", fontWeight:900, marginTop:0, marginBottom:"1.25rem", fontSize:"1.1rem" }}>📋 基本情報</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
              <div>
                <label style={labelStyle}>学校名 <span style={{ color:"#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.school} onChange={e => set("school", e.target.value)} placeholder="北星学園女子中学高等学校" />
              </div>
              <div>
                <label style={labelStyle}>部活名 <span style={{ color:"#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.club} onChange={e => set("club", e.target.value)} placeholder="バドミントン部" />
              </div>
            </div>
            <div style={{ marginBottom:"1rem" }}>
              <label style={labelStyle}>タイトル <span style={{ color:"#e74c3c" }}>*</span></label>
              <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div style={{ marginBottom:"1rem" }}>
              <label style={labelStyle}>短い説明文（一覧ページに表示）</label>
              <input style={inputStyle} value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
              <div>
                <label style={labelStyle}>目標金額（円）<span style={{ color:"#e74c3c" }}>*</span></label>
                <input style={inputStyle} type="number" value={form.goal} onChange={e => set("goal", Number(e.target.value))} min={1000} />
              </div>
              <div>
                <label style={labelStyle}>締切日 <span style={{ color:"#e74c3c" }}>*</span></label>
                <input style={inputStyle} value={form.deadline} onChange={e => set("deadline", e.target.value)} placeholder="2026年5月7日" />
              </div>
              <div>
                <label style={labelStyle}>ステータス</label>
                <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="draft">下書き</option>
                  <option value="active">募集中</option>
                  <option value="completed">終了</option>
                </select>
              </div>
            </div>
          </div>

          {/* 支援ティア */}
          <div style={cardStyle}>
            <h2 style={{ color:"#1a3a5c", fontWeight:900, marginTop:0, marginBottom:"1rem", fontSize:"1.1rem" }}>🏅 支援ティア・特典</h2>
            <p style={{ color:"#888", fontSize:"0.83rem", marginBottom:"1.2rem" }}>各ティアの名称・最低支援金額・特典内容を編集できます</p>
            {tiers.map((tier, i) => (
              <div key={i} style={{ border:"1.5px solid #e0e8f0", borderRadius:"10px", padding:"1rem", marginBottom:"0.9rem", background:"#fafbfd", position:"relative" }}>
                <div style={{ position:"absolute", top:"0.8rem", right:"0.8rem" }}>
                  <button type="button" onClick={() => removeTier(i)} style={{ background:"#fee2e2", border:"none", borderRadius:"6px", padding:"0.25rem 0.6rem", color:"#dc2626", cursor:"pointer", fontSize:"0.78rem", fontWeight:700 }}>削除</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.8rem", marginBottom:"0.7rem" }}>
                  <div>
                    <label style={labelStyle}>ティア名</label>
                    <input style={inputStyle} value={tier.name} onChange={e => setTier(i, "name", e.target.value)} placeholder="例：ブロンズ" />
                  </div>
                  <div>
                    <label style={labelStyle}>最低支援金額（円）</label>
                    <input style={inputStyle} type="number" value={tier.amount} onChange={e => setTier(i, "amount", Number(e.target.value))} min={100} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>特典・リターン内容</label>
                  <input style={inputStyle} value={tier.description} onChange={e => setTier(i, "description", e.target.value)} placeholder="例：お礼メール＋活動報告レポート送付" />
                </div>
              </div>
            ))}
            <button type="button" onClick={addTier} style={{ width:"100%", padding:"0.75rem", background:"#f0f4fa", border:"2px dashed #b0c4de", borderRadius:"10px", color:"#1a3a5c", cursor:"pointer", fontWeight:700, fontSize:"0.9rem" }}>
              ＋ ティアを追加
            </button>
          </div>

          {/* ストーリー */}
          <div style={cardStyle}>
            <h2 style={{ color:"#1a3a5c", fontWeight:900, marginTop:0, marginBottom:"1.25rem", fontSize:"1.1rem" }}>📖 ストーリー</h2>
            <textarea style={{ ...inputStyle, minHeight:"180px", resize:"vertical" }} value={form.story} onChange={e => set("story", e.target.value)} placeholder="プロジェクトの背景・支援金の使い道などを記載" />
          </div>

          {/* メディア */}
          <div style={cardStyle}>
            <h2 style={{ color:"#1a3a5c", fontWeight:900, marginTop:0, marginBottom:"0.5rem", fontSize:"1.1rem" }}>🖼️ メディア</h2>
            <p style={{ color:"#888", fontSize:"0.85rem", marginBottom:"1.25rem" }}>
              画像をドラッグ＆ドロップ、またはクリックして選択（PNG・JPG対応）
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"1rem", marginBottom:"1.25rem" }}>
              {form.images.map((img, i) => (
                <div key={i}>
                  <div style={{ color:"#1a3a5c", fontWeight:700, marginBottom:"0.35rem", fontSize:"0.82rem" }}>
                    写真 {i + 1}{i === 0 ? "（メイン）" : ""}
                  </div>
                  <input
                    id={`img-upload-${i}`}
                    type="file"
                    accept="image/*"
                    style={{ display:"none" }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(file, i);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor={`img-upload-${i}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(i); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(null);
                      const file = e.dataTransfer.files[0];
                      if (file) uploadImage(file, i);
                    }}
                    style={{
                      display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center",
                      border: dragOver === i ? "2px solid #1a3a5c" : "2px dashed #b0c4de",
                      borderRadius:"10px",
                      background: dragOver === i ? "#e8f0fe" : "#f8fafd",
                      cursor:"pointer", height:"130px",
                      overflow:"hidden", position:"relative",
                      transition:"all 0.2s",
                    }}
                  >
                    {uploading[i] ? (
                      <div style={{ color:"#1a3a5c", fontSize:"0.85rem", textAlign:"center" }}>
                        <div style={{ fontSize:"1.5rem", marginBottom:"0.3rem" }}>⏳</div>
                        アップロード中...
                      </div>
                    ) : img ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.5)", color:"#fff", fontSize:"0.7rem", padding:"3px 6px", textAlign:"center" }}>
                          クリックで変更
                        </div>
                      </>
                    ) : (
                      <div style={{ color:"#94a3b8", fontSize:"0.8rem", textAlign:"center", padding:"0.5rem" }}>
                        <div style={{ fontSize:"1.8rem", marginBottom:"0.3rem" }}>📷</div>
                        ドロップ or クリック
                      </div>
                    )}
                  </label>
                  {img && !uploading[i] && (
                    <button
                      type="button"
                      onClick={() => { const imgs = [...form.images]; imgs[i] = ""; set("images", imgs); }}
                      style={{ marginTop:"0.3rem", width:"100%", padding:"0.25rem", background:"#fee2e2", border:"none", borderRadius:"6px", color:"#dc2626", cursor:"pointer", fontSize:"0.75rem", fontWeight:700 }}
                    >
                      🗑 削除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>YouTube 動画URL（任意）</label>
              <input style={inputStyle} value={form.youtube_url} onChange={e => set("youtube_url", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
          </div>

          {/* ボタン */}
          <div style={{ display:"flex", gap:"1rem" }}>
            <button type="submit" disabled={saving} style={{ flex:1, padding:"1rem", background: saving ? "#ccc" : "#d4af37", color:"#0a1628", border:"none", borderRadius:"10px", fontSize:"1.1rem", fontWeight:900, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "⏳ 保存中..." : isEdit ? "💾 変更を保存" : "✅ プロジェクトを作成"}
            </button>
            <Link href="/admin" style={{ padding:"1rem 1.5rem", background:"#f0f4fa", color:"#1a3a5c", border:"1px solid #ccd6e8", borderRadius:"10px", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center" }}>
              キャンセル
            </Link>
          </div>

        </form>
      </div>
    </main>
  );
}
