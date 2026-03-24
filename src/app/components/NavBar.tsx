'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav style={{
      background: '#0a1628', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '64px', position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <img
          src="/logo.png"
          alt="ならバド"
          style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span style={{ color: '#d4960a', fontWeight: 900, fontSize: '15px', letterSpacing: '0.05em' }}>
          CLOUDFAN
        </span>
      </Link>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link href="/projects" style={{
          background: isActive('/projects') ? '#d4af37' : 'transparent',
          color: isActive('/projects') ? '#0a1628' : 'white',
          padding: '8px 16px', borderRadius: '8px',
          fontSize: '14px', fontWeight: 700,
          textDecoration: 'none', transition: 'all 0.2s',
        }}>プロジェクト</Link>
        <Link href="/support" style={{
          background: isActive('/support') ? '#d4af37' : 'transparent',
          color: isActive('/support') ? '#0a1628' : 'white',
          padding: '8px 16px', borderRadius: '8px',
          fontSize: '14px', fontWeight: 700,
          textDecoration: 'none', transition: 'all 0.2s',
        }}>支援する</Link>
        <Link href="/admin" style={{
          background: isActive('/admin') ? '#d4af37' : 'transparent',
          color: isActive('/admin') ? '#0a1628' : 'rgba(255,255,255,0.5)',
          padding: '8px 16px', borderRadius: '8px',
          fontSize: '13px', fontWeight: isActive('/admin') ? 700 : 400,
          textDecoration: 'none', transition: 'all 0.2s',
        }}>管理</Link>
      </div>
    </nav>
  );
}
