import type { Metadata } from "next/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudFan - スポーツ支援クラウドファンディング",
  description: "北海道のスポーツチームを支援するクラウドファンディングプラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Noto Sans JP', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
