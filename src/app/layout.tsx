import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';

const notoSans = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CloudFan - クラウドファンディング',
  description: '北海道の部活を支援するクラウドファンディングサービス',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSans.className}>
      <body style={{
        margin: 0,
        padding: 0,
        WebkitFontSmoothing: 'antialiased',
      }}>
        {children}
      </body>
    </html>
  );
}
