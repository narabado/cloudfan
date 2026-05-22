export default function CancelPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '48px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>😢</div>
        <h1 style={{ color: '#d97706', fontWeight: 700, fontSize: '1.5rem', marginBottom: 8 }}>お支払いがキャンセルされました</h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 24 }}>
          お支払いはキャンセルされました。<br />
          もし引き続きご支援をご検討いただける場合は、再度お試しください。
        </p>
        <a href="/" style={{ display: 'inline-block', background: '#1a3a5c', color: 'white', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          トップページへ戻る
        </a>
      </div>
    </div>
  );
}