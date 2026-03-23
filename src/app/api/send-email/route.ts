import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'narabadocf@gmail.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTransferCode(): Promise<string> {
  const { data, error } = await supabase.rpc('increment_transfer_counter');
  if (error || !data) {
    console.error('Counter error:', error);
    return String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  }
  return String(data).padStart(3, '0');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      supporterName,
      supporterEmail,
      tier,
      units,
      totalAmount,
      message,
      projectTitle,
    } = body;

    const code = await generateTransferCode();

    // ── Supabaseへ保存 ──
    const { error: insertError } = await supabase.from('supporters').insert({
      project_id:    1,
      project_title: projectTitle || '',
      name:          supporterName,
      email:         supporterEmail,
      tier:          tier,
      units:         Number(units),
      amount:        Number(totalAmount),   // ← 修正：total_amount → amount（実際のカラム名）
      transfer_code: code,
      status:        'pending',
      message:       message || '',
    });

    // ── DB保存失敗時は即リターン（メール送信しない）──
    if (insertError) {
      console.error('Supabase保存エラー:', insertError.message);
      return NextResponse.json(
        { success: false, error: 'データベース保存エラー', detail: insertError.message },
        { status: 500 }
      );
    }
    console.log('Supabase保存成功 コード:', code);

    const dl = new Date();
    dl.setDate(dl.getDate() + 14);
    const dlStr = `${dl.getFullYear()}年${dl.getMonth() + 1}月${dl.getDate()}日（${['日','月','火','水','木','金','土'][dl.getDay()]}）`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const sHtml = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
<div style="background:linear-gradient(135deg,#0a1628,#1a3a5c);padding:28px;text-align:center;">
  <h1 style="color:#d4af37;margin:0;font-size:20px;letter-spacing:0.05em;">BADMINTON SUPPORT HOKKAIDO</h1>
  <p style="color:#fff;margin:6px 0 0;font-size:13px;">ご支援ありがとうございます</p>
</div>
<div style="padding:28px;">
  <p style="font-size:16px;margin:0 0 8px;">${supporterName} 様</p>
  <p style="font-size:14px;color:#555;margin:0 0 20px;">「${projectTitle || '北海道バドミントン支援クラファン Vol.1'}」へのご支援、誠にありがとうございます。</p>

  <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin-bottom:20px;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;">📋 ご支援内容</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:5px 0;color:#888;font-size:13px;width:120px;">管理番号</td><td style="padding:5px 0;font-weight:900;font-size:28px;color:#d4af37;letter-spacing:0.1em;">${code}</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">ランク</td><td style="padding:5px 0;font-weight:700;">${tier}サポーター</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">口数</td><td style="padding:5px 0;">${units}口</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">支援金額</td><td style="padding:5px 0;font-weight:900;font-size:20px;color:#d4af37;">¥${Number(totalAmount).toLocaleString()}</td></tr>
    </table>
  </div>

  <div style="background:linear-gradient(135deg,#0a1628,#1a3060);border-radius:10px;padding:20px;margin:20px 0;text-align:center;">
    <div style="color:#aac;font-size:12px;margin-bottom:6px;">お振込管理番号</div>
    <div style="color:#d4af37;font-family:monospace;font-size:48px;font-weight:bold;letter-spacing:8px;">${code}</div>
    <div style="color:#aac;font-size:12px;margin-top:6px;">振込名義人名の前に必ずご記載ください</div>
  </div>

  <div style="background:#fffbf0;border:2px solid #d4af37;border-radius:8px;padding:20px;margin-bottom:20px;">
    <h3 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;">🏦 振込先情報</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:5px 0;color:#888;font-size:13px;width:120px;">銀行名</td><td style="padding:5px 0;font-size:13px;">住信SBIネット銀行（0038）</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">支店名</td><td style="padding:5px 0;font-size:13px;">法人第一支店（106）</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">口座種別</td><td style="padding:5px 0;font-size:13px;">普通</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">口座番号</td><td style="padding:5px 0;font-size:14px;font-weight:700;">2787470</td></tr>
      <tr><td style="padding:5px 0;color:#888;font-size:13px;">口座名義</td><td style="padding:5px 0;font-size:13px;font-weight:700;">一般社団法人 Plus Mind</td></tr>
      <tr style="border-top:2px solid #d4af37;">
        <td style="padding:10px 0 5px;color:#888;font-size:13px;">振込金額</td>
        <td style="padding:10px 0 5px;font-size:15px;font-weight:900;color:#d4af37;">¥${Number(totalAmount).toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#888;font-size:13px;">振込期限</td>
        <td style="padding:5px 0;font-size:13px;color:#e74c3c;font-weight:700;">${dlStr}</td>
      </tr>
    </table>
    <div style="background:#fff8e1;border-radius:6px;padding:14px;margin-top:14px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#888;">振込名義人名の前に必ずこの番号を入力してください</p>
      <p style="margin:6px 0;font-size:13px;color:#555;">例）<strong>${code} ヤマダ タロウ</strong></p>
      <p style="margin:4px 0 0;font-size:32px;font-weight:900;color:#d4af37;letter-spacing:0.15em;">${code}</p>
    </div>
  </div>

  ${message ? `<div style="background:#f0f4ff;border-radius:8px;padding:16px;margin-bottom:20px;"><p style="margin:0 0 6px;font-size:12px;color:#888;">応援メッセージ</p><p style="margin:0;font-style:italic;font-size:14px;">"${message}"</p></div>` : ''}

  <div style="background:#e8f4fd;border-radius:8px;padding:20px;margin-bottom:20px;">
    <h3 style="margin:0 0 16px;font-size:14px;color:#1a3a5c;">✅ 入金確認後の流れ</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:33%;padding:0 6px 0 0;vertical-align:top;text-align:center;">
          <div style="background:#fff;border-radius:8px;padding:12px 8px;">
            <div style="font-size:20px;margin-bottom:6px;">📊</div>
            <div style="font-size:11px;color:#1a3a5c;font-weight:700;line-height:1.5;">入金確認後、サイト上の支援情報・支援者数が更新されます</div>
          </div>
        </td>
        <td style="width:33%;padding:0 3px;vertical-align:top;text-align:center;">
          <div style="background:#fff;border-radius:8px;padding:12px 8px;">
            <div style="font-size:20px;margin-bottom:6px;">🎁</div>
            <div style="font-size:11px;color:#1a3a5c;font-weight:700;line-height:1.5;">返礼品（部員・監督からの直筆メッセージカード）を順次お送りします</div>
          </div>
        </td>
        <td style="width:33%;padding:0 0 0 6px;vertical-align:top;text-align:center;">
          <div style="background:#fff;border-radius:8px;padding:12px 8px;">
            <div style="font-size:20px;margin-bottom:6px;">📧</div>
            <div style="font-size:11px;color:#1a3a5c;font-weight:700;line-height:1.5;">活動報告メールを定期的にお届けします</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <p style="font-size:13px;color:#888;">ご不明な点は <a href="mailto:${ADMIN_EMAIL}" style="color:#d4af37;">${ADMIN_EMAIL}</a> までご連絡ください。</p>
</div>
<div style="background:#0a1628;padding:16px;text-align:center;">
  <p style="color:#888;font-size:11px;margin:0;">© 2026 BADMINTON SUPPORT HOKKAIDO / 一般社団法人 Plus Mind</p>
</div>
</div>`;

    const aHtml = `<div style="font-family:Arial,sans-serif;max-width:500px;">
<h2 style="background:#0a1628;color:#d4af37;padding:12px 20px;margin:0;">【新規支援通知】</h2>
<div style="padding:20px;background:#f9f9f9;">
  <p style="font-size:15px;">管理番号: <strong style="font-size:26px;color:#d4af37;">${code}</strong></p>
  <p>氏名: <strong>${supporterName}</strong></p>
  <p>メール: ${supporterEmail}</p>
  <p>ランク: ${tier}サポーター</p>
  <p>金額: <strong style="color:#d4af37;">¥${Number(totalAmount).toLocaleString()}</strong>（${units}口）</p>
  <p>振込期限: <span style="color:#e74c3c;font-weight:700;">${dlStr}</span></p>
  ${message ? `<p>応援メッセージ: <em>${message}</em></p>` : ''}
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
  <p style="color:#888;font-size:12px;">管理画面で承認・却下できます → <a href="https://cloudfan.vercel.app/admin">管理画面を開く</a></p>
</div>
</div>`;

    await transporter.sendMail({
      from: `"BADMINTON SUPPORT HOKKAIDO" <${ADMIN_EMAIL}>`,
      to: supporterEmail,
      subject: `【支援受付】管理番号 ${code} - ご支援ありがとうございます`,
      html: sHtml,
    });

    await transporter.sendMail({
      from: `"BADMINTON SUPPORT HOKKAIDO" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `【新規支援】${supporterName}様 ¥${Number(totalAmount).toLocaleString()} 番号:${code}`,
      html: aHtml,
    });

    return NextResponse.json({ success: true, transferCode: code });

  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('ERROR:', err?.message, err?.code);
    return NextResponse.json(
      { error: 'メール送信失敗', detail: err?.message },
      { status: 500 }
    );
  }
}
