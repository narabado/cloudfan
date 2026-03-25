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
        setError("繝代せ繝ｯ繝ｼ繝峨′驕輔＞縺ｾ縺・);
      }
    } catch {
      setError("繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a4f 100%)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "48px 40px",
          width: 360,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>柏</div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 4,
            color: "#1e3a5f",
          }}
        >
          邂｡逅・・・繝ｼ繧ｸ
        </h1>
        <p
          style={{ color: "#6b7280", fontSize: 13, marginBottom: 28 }}
        >
          繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="繝代せ繝ｯ繝ｼ繝・
          autoFocus
          style={{
            width: "100%",
            padding: "12px 16px",
            border: error ? "2px solid #dc2626" : "2px solid #d1d5db",
            borderRadius: 8,
            fontSize: 16,
            outline: "none",
            marginBottom: 8,
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>
            {error}
          </p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #1e3a5f, #2d6a4f)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "遒ｺ隱堺ｸｭ..." : "繝ｭ繧ｰ繧､繝ｳ"}
        </button>
      </div>
    </div>
  );
}
