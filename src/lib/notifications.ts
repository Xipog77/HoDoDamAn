import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'

interface Recipient {
  displayName?: string
  email?: string | null
  phone?: string | null
}

const LOG_DIR = '/app/uploads' // Path inside Docker container (mapped to host ./uploads)
const LOG_FILE = path.join(LOG_DIR, 'notifications.log')

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

export async function sendNotification(recipient: Recipient, title: string, content: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `
[NOTIFICATION DISPATCH]
Timestamp: ${timestamp}
Recipient: ${recipient.displayName || 'Unknown'} (Email: ${recipient.email || 'N/A'}, Phone: ${recipient.phone || 'N/A'})
Title: ${title}
Content: ${content}
----------------------------------------
`
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    // Append to file
    fs.appendFileSync(LOG_FILE, logMessage, 'utf-8')
    console.log(`[Notification Logged] to ${LOG_FILE} for ${recipient.displayName}`)

    // Attempt to send real email if SMTP configured
    const transporter = getTransporter()
    if (transporter && recipient.email) {
      console.log(`[SMTP Dispatch] Sending notification email to ${recipient.email}...`)
      await transporter.sendMail({
        from: `"Hệ thống Tộc phả Họ Đỗ Đàm An" <${process.env.SMTP_USER}>`,
        to: recipient.email,
        subject: title,
        text: content,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2dcd0; border-radius: 16px; background-color: #fdfcfb; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #634f38; font-family: serif; margin: 0; font-size: 22px;">Tộc Phả Họ Đỗ Đàm An</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #8a7a65; letter-spacing: 1px; text-transform: uppercase;">Thông Báo Hệ Thống</p>
            </div>
            
            <p style="font-size: 15px; color: #4a3e3d; line-height: 1.6;">
              Thân gửi thành viên <strong>${recipient.displayName || 'Họ Đỗ Đàm An'}</strong>,
            </p>
            
            <div style="background-color: #ffffff; padding: 18px; border-radius: 12px; border-left: 4px solid #d4af37; margin: 20px 0; color: #333333; line-height: 1.6; font-size: 15px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.01);">
              <strong>${title}</strong>
              <p style="margin-top: 10px; color: #4a4a4a; white-space: pre-wrap;">${content}</p>
            </div>
            
            <p style="font-size: 13px; color: #666666; line-height: 1.6;">
              Bạn nhận được email này vì đã đăng ký tài khoản trên hệ thống Tộc phả và đồng ý nhận thông báo.
            </p>
            
            <div style="margin-top: 30px; border-top: 1px solid #e2dcd0; padding-top: 15px; text-align: center;">
              <p style="font-size: 11px; color: #999999; margin: 0;">
                Đây là email gửi tự động từ địa chỉ <strong>${process.env.SMTP_USER}</strong>. Vui lòng không trả lời trực tiếp email này.
              </p>
            </div>
          </div>
        `
      })
      console.log(`[SMTP Success] Email sent successfully to ${recipient.email}`)
    } else {
      if (!transporter) {
        console.log(`[SMTP Skip] SMTP not configured. Notification logged only.`)
      } else {
        console.log(`[SMTP Skip] Recipient ${recipient.displayName} has no email address.`)
      }
    }
  } catch (err) {
    console.error('Failed to log or send notification:', err)
  }
}
