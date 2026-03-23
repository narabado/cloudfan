import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'narabadocf@gmail.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 振込コードを生成（RPCが失敗した場合はランダム3桁）
async function generateTransferCode(): Promise<string> {
  const { data, error } = await supabase.rpc('increment_transfer_counter');
  if (error || !data) {
    console.error('Counter error:', error);
    const random = Math.floor(Math.random() * 900) + 100;
    return `CF${random}`;
  }
  return `CF${String(data).padStart(4, '0')}`;
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
      projectId,       // ★ 追加：プロジェクトID
    } = body;

    // 振込コード生成
    const transferCode = await generateTransferCode();

    // Supabaseへ保存
    const { error: insertError } = await supabase.from('supporters').insert({
      project_id:    Number(projectId) || 1,   // ★ 追加
      project_title: projectTitle || '',
      name:          supporterName,
      email:         supporterEmail,
      tier:          tier,
      units:         units,
      total_amount:  totalAmount,
      transfer_code: transferCode,
      status:        'pending',
      message:       message || '',
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'DB保存に失敗しました' }, { status: 500 });
    }

    // 振込期限（14日後）
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14);
    const deadlineStr = `${deadline.getFullYear()}年${deadline.getMonth() + 1}月${deadline.getDate()}日`;

    // メール送信設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 支援者へのメール
    const supporterHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a3a5c;">ご支援ありがとうございます！</h2>
        <p>${supporterName} 様</p>
        <p>「${projectTitle}」へのご支援を受け付けました。<br>
        以下の振込情報をご確認のうえ、期限内にお振り込みをお願いいたします。</p>

        <table style="border-collapse:collapse;width:100%;margin:20px 0;">
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">振込コード</td>
            <td style="padding:10px;border:1px solid #ddd;font-size:1.4em;color:#e55;">${transferCode}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">支援ティア</td>
            <td style="padding:10px;border:1px solid #ddd;">${tier}</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">口数</td>
            <td style="padding:10px;border:1px solid #ddd;">${units}口</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">振込金額</td>
            <td style="padding:10px;border:1px solid #ddd;font-size:1.2em;color:#1a3a5c;font-weight:bold;">
              ¥${Number(totalAmount).toLocaleString()}
            </td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">振込期限</td>
            <td style="padding:10px;border:1px solid #ddd;color:#e55;">${deadlineStr}まで</td>
          </tr>
        </table>

        <h3 style="color:#1a3a5c;">振込先口座</h3>
        <table style="border-collapse:collapse;width:100%;margin:20px 0;">
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">銀行名</td>
            <td style="padding:10px;border:1px solid #ddd;">北洋銀行</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">支店名</td>
            <td style="padding:10px;border:1px solid #ddd;">札幌支店</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">口座種別</td>
            <td style="padding:10px;border:1px solid #ddd;">普通</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">口座番号</td>
            <td style="padding:10px;border:1px solid #ddd;">1234567</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">口座名義</td>
            <td style="padding:10px;border:1px solid #ddd;">ナラバ ドウシ</td>
          </tr>
        </table>

        <p style="background:#fff3cd;padding:15px;border-radius:8px;">
          ⚠️ 振込時は必ず振込コード <strong>${transferCode}</strong> をお名前欄に入力してください。
        </p>
        ${message ? `<p>メッセージ：${message}</p>` : ''}
        <p style="color:#666;font-size:0.9em;">
          ご不明な点は narabadocf@gmail.com までお問い合わせください。
        </p>
      </div>
    `;

    // 管理者へのメール
    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a3a5c;">【新規支援申込】${projectTitle}</h2>
        <table style="border-collapse:collapse;width:100%;margin:20px 0;">
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">振込コード</td>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;color:#e55;">${transferCode}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">支援者名</td>
            <td style="padding:10px;border:1px solid #ddd;">${supporterName}</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">メール</td>
            <td style="padding:10px;border:1px solid #ddd;">${supporterEmail}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">ティア</td>
            <td style="padding:10px;border:1px solid #ddd;">${tier}</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">口数</td>
            <td style="padding:10px;border:1px solid #ddd;">${units}口</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">金額</td>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">¥${Number(totalAmount).toLocaleString()}</td>
          </tr>
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">振込期限</td>
            <td style="padding:10px;border:1px solid #ddd;">${deadlineStr}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">プロジェクトID</td>
            <td style="padding:10px;border:1px solid #ddd;">${projectId || 1}</td>
          </tr>
          ${message ? `
          <tr style="background:#f0f4f8;">
            <td style="padding:10px;border:1px solid #ddd;font-weight:bold;">メッセージ</td>
            <td style="padding:10px;border:1px solid #ddd;">${message}</td>
          </tr>` : ''}
        </table>
        <p>
          <a href="https://cloudfan.vercel.app/admin"
             style="background:#1a3a5c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
            管理画面で承認する
          </a>
        </p>
      </div>
    `;

    // メール送信
    await transporter.sendMail({
      from:    ADMIN_EMAIL,
      to:      supporterEmail,
      subject: `【振込案内】${projectTitle} 振込コード：${transferCode}`,
      html:    supporterHtml,
    });

    await transporter.sendMail({
      from:    ADMIN_EMAIL,
      to:      ADMIN_EMAIL,
      subject: `【新規支援】${supporterName}様 ¥${Number(totalAmount).toLocaleString()} コード：${transferCode}`,
      html:    adminHtml,
    });

    return NextResponse.json({ success: true, transferCode });

  } catch (err) {
    console.error('Send-email error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}