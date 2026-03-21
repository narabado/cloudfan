import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BADMINTON SUPPORT HOKKAIDO",
  description: "北海道の部活を応援するクラウドファンディング",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, fontFamily: "sans-serif", overflowX: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
