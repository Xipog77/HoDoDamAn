import nodemailer from 'nodemailer'

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE === 'true' || port === '465',
    auth: { user, pass },
  })
}

export function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS)
}

/**
 * Send an email using the configured SMTP server.
 * Returns true if sent, false if SMTP is not configured; throws on SMTP errors.
 */
export async function sendEmail(to: string, subject: string, html: string, text?: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[SMTP Skip] SMTP not configured. Attempted email to: ${to}, Subject: ${subject}`)
    return false
  }

  await transporter.sendMail({
    from: `"Hệ thống Tộc phả Họ Đỗ Đàm An" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: text || '',
    html,
  })
  return true
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** HTML body for a notification email (title/content are plain text and get escaped). */
export function renderNotificationEmail(displayName: string | null | undefined, title: string, content: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2dcd0; border-radius: 16px; background-color: #fdfcfb;">
      <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #634f38; font-family: serif; margin: 0; font-size: 22px;">Tộc Phả Họ Đỗ Đàm An</h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #8a7a65; letter-spacing: 1px; text-transform: uppercase;">Thông Báo Hệ Thống</p>
      </div>
      <p style="font-size: 15px; color: #4a3e3d; line-height: 1.6;">
        Thân gửi thành viên <strong>${escapeHtml(displayName || 'Họ Đỗ Đàm An')}</strong>,
      </p>
      <div style="background-color: #ffffff; padding: 18px; border-radius: 12px; border-left: 4px solid #d4af37; margin: 20px 0; color: #333333; line-height: 1.6; font-size: 15px;">
        <strong>${escapeHtml(title)}</strong>
        <p style="margin-top: 10px; color: #4a4a4a; white-space: pre-wrap;">${escapeHtml(content)}</p>
      </div>
      <p style="font-size: 13px; color: #666666; line-height: 1.6;">
        Bạn nhận được email này vì đã đăng ký tài khoản trên hệ thống Tộc phả và đồng ý nhận thông báo.
      </p>
      <div style="margin-top: 30px; border-top: 1px solid #e2dcd0; padding-top: 15px; text-align: center;">
        <p style="font-size: 11px; color: #999999; margin: 0;">
          Đây là email gửi tự động từ địa chỉ <strong>${escapeHtml(process.env.SMTP_USER || '')}</strong>. Vui lòng không trả lời trực tiếp email này.
        </p>
      </div>
    </div>
  `
}
