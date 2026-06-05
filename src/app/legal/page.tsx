export default function LegalPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 32, borderBottom: "2px solid #e5e7eb", paddingBottom: 16 }}>
        特定商取引法に基づく表記
      </h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <tbody>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", width: "30%", verticalAlign: "top" }}>販売業者</th>
            <td style={{ padding: "16px 12px" }}>一般社団法人Plus Mind</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>代表者</th>
            <td style={{ padding: "16px 12px" }}>梅山 和紀</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>所在地</th>
            <td style={{ padding: "16px 12px" }}>〒006-0802 北海道札幌市手稲区新発寒二条1丁目2-12</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>メールアドレス</th>
            <td style={{ padding: "16px 12px" }}>narabado2024@gmail.com</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>サービス名</th>
            <td style={{ padding: "16px 12px" }}>ならバト（スポーツクラウドファンディング）</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>販売価格</th>
            <td style={{ padding: "16px 12px" }}>各プロジェクトページに記載の金額（日本円）</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>支払方法</th>
            <td style={{ padding: "16px 12px" }}>クレジットカード決済（Stripe）</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>支払時期</th>
            <td style={{ padding: "16px 12px" }}>ご注文時に即時決済</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>サービス提供時期</th>
            <td style={{ padding: "16px 12px" }}>お支払い完了後、速やかに支援を受け付けます</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>返品・キャンセル</th>
            <td style={{ padding: "16px 12px" }}>支払い完了後のキャンセル・返金は原則承っておりません。ただし、プロジェクトが中止となった場合は全額返金いたします。</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>追加手数料</th>
            <td style={{ padding: "16px 12px" }}>なし（表示価格以外の手数料は一切かかりません）</td>
          </tr>
          <tr>
            <th style={{ padding: "16px 12px", textAlign: "left", background: "#f9fafb", verticalAlign: "top" }}>動作環境</th>
            <td style={{ padding: "16px 12px" }}>最新バージョンの各種ブラウザ（Chrome / Safari / Firefox / Edge）</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}