"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("パスワードが違います");
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 100%)",
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        textAlign: "center",
      }}>
        <div style={{ marginBottom: 8 }}>
          <img src="/logo.png" alt="CloudFan" style={{ height: 52 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1a2e4a", marginBottom: 6 }}>
          CloudFan 管理者
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
          autoFocus
          style={{
            width: "100%",
            padding: "14px 18px",
            border: error ? "2px solid #dc2626" : "2px solid #e2e8f0",
            borderRadius: 10,
            fontSize: 16,
            outline: "none",
            textAlign: "center",
            letterSpacing: "0.1em",
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{
            marginBottom: 14,
            padding: "10px 16px",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
          }}>
            ❌ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            background: loading ? "#94a3b8" : "linear-gradient(135deg, #1a2e4a, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,0.35)",
            marginBottom: 16,
          }}
        >
          {loading ? "確認中..." : "🔓 ログイン"}
        </button>

        <p style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 20 }}>
          ブラウザを閉じると自動ログアウトします
        </p>

        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
          <a href="/" style={{
            display: "block",
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
            textDecoration: "none",
            padding: "10px 0",
            borderRadius: 8,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            fontWeight: 600,
          }}>
            ← トップページへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
