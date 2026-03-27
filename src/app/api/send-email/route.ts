import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "narabadocf@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTransferCode(): Promise<string> {
  const { data, error } = await supabase.rpc("increment_transfer_counter");
  if (error || !data) {
    console.error("Counter error:", error);
    const random = Math.floor(Math.random() * 900) + 100;
    return `CF${random}`;
  }
  return `CF${String(data).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supporterName, supporterEmail, tier, units, totalAmount, message, projectTitle, projectId } = body;

    const transferCode = await generateTransferCode();

    const { error: insertError } = await supabase.from("supporters").insert({
      project_id:    Number(projectId) || 1,
      project_title: projectTitle || "",
      name:          supporterName,
      email:         supporterEmail,
      tier:          tier,
      units:         units,
      total_amount:  totalAmount,
      transfer_code: transferCode,
      status:        "pending",
      message:       message || "",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "DB保存に失敗しました" }, { status: 500 });
    }

    // ✅ 振込期限を申込日から7日後に設定
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const deadlineStr = `${deadline.getFullYear()}年${deadline.getMonth() + 1}月${deadline.getDate()}日`;
    const deadlineDay = ["日","月","火","水","木","金","土"][deadline.getDay()];
    const deadlineFull = `${deadlineStr}（${deadlineDay}）`;
    const fmtAmt = (n: number) => `¥${Number(n).toLocaleString("ja-JP")}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: ADMIN_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    });

    // ===== 支援者メール =====
    const supporterHtml = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ご支援ありがとうございます</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <tr><td style="background:linear-gradient(135deg,#1a2744 0%,#243660 100%);padding:36px 40px;text-align:center;">
    <div style="font-size:11px;color:#c9a227;letter-spacing:4px;margin-bottom:6px;text-transform:uppercase;">BADMINTON SUPPORT HOKKAIDO</div>
    <div style="font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:1px;">ご支援ありがとうございます</div>
  </td></tr>

  <tr><td style="padding:36px 40px 8px;">
    <p style="font-size:17px;color:#1a2744;margin:0 0 6px;font-weight:bold;">${supporterName} 様</p>
    <p style="font-size:14px;color:#555;margin:0 0 28px;line-height:1.8;">
      『${projectTitle}』へのご支援、誠にありがとうございます。<br>
      以下の振込情報をご確認のうえ、期限内にお振り込みをお願いいたします。
    </p>

    <div style="background:#f7f9fc;border-radius:10px;padding:22px 24px;margin-bottom:28px;border:1px solid #e8ecf0;">
      <div style="font-size:12px;font-weight:bold;color:#1a2744;margin-bottom:14px;border-left:3px solid #c9a227;padding-left:10px;letter-spacing:1px;">□ ご支援内容</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:9px 10px;font-size:12px;color:#999;width:38%;">管理番号</td>
            <td style="padding:9px 10px;font-size:24px;font-weight:bold;color:#c9a227;letter-spacing:4px;">${transferCode}</td></tr>
        <tr style="background:#fff;"><td style="padding:9px 10px;font-size:12px;color:#999;">ランク</td>
            <td style="padding:9px 10px;font-size:14px;font-weight:bold;color:#333;">${tier}</td></tr>
        <tr><td style="padding:9px 10px;font-size:12px;color:#999;">口数</td>
            <td style="padding:9px 10px;font-size:14px;color:#333;">${units}口</td></tr>
        <tr style="background:#fff;"><td style="padding:9px 10px;font-size:12px;color:#999;">支援金額</td>
            <td style="padding:9px 10px;font-size:18px;font-weight:bold;color:#e74c3c;">${fmtAmt(totalAmount)}</td></tr>
      </table>
    </div>

    <div style="background:linear-gradient(135deg,#1a2744 0%,#243660 100%);border-radius:10px;padding:28px 24px;text-align:center;margin-bottom:28px;">
      <div style="font-size:11px;color:#8899bb;margin-bottom:10px;letter-spacing:2px;">お振込管理番号</div>
      <div style="font-size:52px;font-weight:bold;color:#ffffff;letter-spacing:10px;line-height:1;">${transferCode}</div>
      <div style="font-size:12px;color:#8899bb;margin-top:12px;">振込名義人の前に必ずご記載ください</div>
    </div>

    <div style="background:#fffde7;border:1px solid #ffe082;border-radius:10px;padding:22px 24px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:bold;color:#1a2744;margin-bottom:14px;">🏦 振込先情報</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;font-size:13px;color:#999;width:38%;border-bottom:1px solid #f5e47a;">銀行名</td>
            <td style="padding:8px 0;font-size:13px;color:#333;border-bottom:1px solid #f5e47a;">住信SBIネット銀行（0038）</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;border-bottom:1px solid #f5e47a;">支店名</td>
            <td style="padding:8px 0;font-size:13px;color:#333;border-bottom:1px solid #f5e47a;">法人第一支店（106）</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;border-bottom:1px solid #f5e47a;">口座種別</td>
            <td style="padding:8px 0;font-size:13px;color:#333;border-bottom:1px solid #f5e47a;">普通</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;border-bottom:1px solid #f5e47a;">口座番号</td>
            <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333;border-bottom:1px solid #f5e47a;">2787470</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;border-bottom:1px solid #f5e47a;">口座名義</td>
            <td style="padding:8px 0;font-size:14px;font-weight:bold;color:#333;border-bottom:1px solid #f5e47a;">一般社団法人 Plus Mind</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;border-bottom:1px solid #f5e47a;">振込金額</td>
            <td style="padding:8px 0;font-size:15px;font-weight:bold;color:#e74c3c;border-bottom:1px solid #f5e47a;">${fmtAmt(totalAmount)}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#999;">振込期限</td>
            <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#e74c3c;">${deadlineFull}</td></tr>
      </table>
    </div>

    <div style="background:#fffbf0;border:1px solid #ffe082;border-radius:10px;padding:18px 24px;text-align:center;margin-bottom:28px;">
      <div style="font-size:12px;color:#888;margin-bottom:6px;">振込名義人名の前に必ずこの番号を入力してください</div>
      <div style="font-size:12px;color:#aaa;margin-bottom:8px;">例）${transferCode} ヤマダ タロウ</div>
      <div style="font-size:40px;font-weight:bold;color:#c9a227;letter-spacing:8px;">${transferCode}</div>
    </div>

    ${message ? `<div style="background:#e3f2fd;border-left:4px solid #1565c0;border-radius:6px;padding:16px 20px;margin-bottom:28px;">
      <div style="font-size:12px;color:#1565c0;font-weight:bold;margin-bottom:6px;">応援メッセージ</div>
      <p style="font-size:14px;color:#333;margin:0;line-height:1.7;">"${message}"</p>
    </div>` : ""}

    <div style="background:#f0f9f0;border-radius:10px;padding:22px 24px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:bold;color:#1a2744;margin-bottom:18px;">✅ 入金確認後の流れ</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:33%;text-align:center;padding:6px 8px;vertical-align:top;">
            <div style="font-size:26px;margin-bottom:8px;">📊</div>
            <div style="font-size:11px;color:#555;line-height:1.6;">入金確認後、サイト上の支援情報・支援者数が更新されます</div>
          </td>
          <td style="width:33%;text-align:center;padding:6px 8px;vertical-align:top;">
            <div style="font-size:26px;margin-bottom:8px;">🎁</div>
            <div style="font-size:11px;color:#555;line-height:1.6;">お礼メール＋活動報告レポート送付</div>
          </td>
          <td style="width:33%;text-align:center;padding:6px 8px;vertical-align:top;">
            <div style="font-size:26px;margin-bottom:8px;">📧</div>
            <div style="font-size:11px;color:#555;line-height:1.6;">活動報告メールを定期的にお届けします</div>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size:12px;color:#999;text-align:center;margin-bottom:0;">
      ご不明な点は <a href="mailto:narabadocf@gmail.com" style="color:#1a2744;font-weight:bold;">narabadocf@gmail.com</a> までご連絡ください。
    </p>
  </td></tr>

  <tr><td style="background:#1a2744;padding:20px 40px;text-align:center;">
    <p style="color:#8899bb;font-size:11px;margin:0;letter-spacing:1px;">© 2025 BADMINTON SUPPORT HOKKAIDO | 一般社団法人 Plus Mind</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // ===== 管理者メール =====
    const adminHtml = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>新規支援申込通知</title></head>
<body style="font-family:Arial,sans-serif;background:#f0f2f5;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1a2744 0%,#243660 100%);padding:22px 30px;">
    <h2 style="color:#c9a227;margin:0;font-size:16px;letter-spacing:1px;">【管理者通知】新しい支援申込</h2>
    <p style="color:#8899bb;margin:4px 0 0;font-size:12px;">${projectTitle}</p>
  </div>
  <div style="padding:28px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f7f9fc;"><td style="padding:10px 12px;font-size:12px;color:#999;width:35%;border-bottom:1px solid #eee;">プロジェクトID</td><td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee;">${projectId || 1}</td></tr>
      <tr><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">支援者名</td><td style="padding:10px 12px;font-size:14px;font-weight:bold;border-bottom:1px solid #eee;">${supporterName}</td></tr>
      <tr style="background:#f7f9fc;"><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">メール</td><td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee;">${supporterEmail}</td></tr>
      <tr><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">ランク</td><td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee;">${tier}</td></tr>
      <tr style="background:#f7f9fc;"><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">口数</td><td style="padding:10px 12px;font-size:13px;border-bottom:1px solid #eee;">${units}口</td></tr>
      <tr><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">支援金額</td><td style="padding:10px 12px;font-size:16px;font-weight:bold;color:#e74c3c;border-bottom:1px solid #eee;">${fmtAmt(totalAmount)}</td></tr>
      <tr style="background:#f7f9fc;"><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">振込コード</td><td style="padding:10px 12px;font-size:18px;font-weight:bold;color:#c9a227;letter-spacing:3px;border-bottom:1px solid #eee;">${transferCode}</td></tr>
      <tr><td style="padding:10px 12px;font-size:12px;color:#999;border-bottom:1px solid #eee;">振込期限</td><td style="padding:10px 12px;font-size:13px;font-weight:bold;color:#e74c3c;border-bottom:1px solid #eee;">${deadlineFull}</td></tr>
      ${message ? `<tr style="background:#f7f9fc;"><td style="padding:10px 12px;font-size:12px;color:#999;">メッセージ</td><td style="padding:10px 12px;font-size:13px;">${message}</td></tr>` : ""}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="https://cloudfan.vercel.app/admin" style="background:#1a2744;color:#fff;padding:12px 30px;text-decoration:none;border-radius:6px;font-size:14px;display:inline-block;">管理画面で確認する</a>
    </div>
  </div>
</div>
</body></html>`;

    await transporter.sendMail({
      from:    `"BADMINTON SUPPORT HOKKAIDO" <${ADMIN_EMAIL}>`,
      to:      supporterEmail,
      subject: `【支援受付】管理番号 ${transferCode} - ご支援ありがとうございます`,
      html:    supporterHtml,
    });

    await transporter.sendMail({
      from:    `"BADMINTON SUPPORT HOKKAIDO" <${ADMIN_EMAIL}>`,
      to:      ADMIN_EMAIL,
      subject: `【管理者通知】新規支援申込 ${transferCode}（${supporterName}様・${fmtAmt(totalAmount)}）`,
      html:    adminHtml,
    });

    // ✅ transferDeadline をレスポンスに含めて完了画面で使用できるようにする
    return NextResponse.json({ success: true, transferCode, transferDeadline: deadlineFull });

  } catch (err) {
    console.error("Send-email error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
