"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch("/api/admin-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setErr("パスワードが違います");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#1e3a5f 0%,#2d6a4f 100%)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "48px 40px",
        width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center",
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
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="パスワード"
          autoFocus
          style={{
            width: "100%", padding: "12px 16px", boxSizing: "border-box",
            border: err ? "2px solid #dc2626" : "2px solid #d1d5db",
            borderRadius: 8, fontSize: 16, outline: "none", marginBottom: 8,
          }}
        />
        {err && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{err}</p>}
        <button onClick={handleLogin} style={{
          width: "100%", padding: "12px",
          background: "linear-gradient(135deg,#1e3a5f,#2d6a4f)",
          color: "#fff", border: "none", borderRadius: 8,
          fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8,
        }}>
          ログイン
        </button>
      </div>
    </div>
  );
}
