import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { sendEmail } from '@/lib/notifications'
import bcrypt from 'bcryptjs'

export const Route = createFileRoute('/api/admin/users')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        const allUsers = await db.query.users.findMany()
        return Response.json({ users: allUsers.map(u => ({ ...u, passwordHash: undefined })) })
      },

      POST: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          const body = await request.json()
          const { action, userId, username, displayName, password, role, status, personId, email, sendEmail: shouldSendEmail } = body

          if (action === 'CREATE') {
            if (!username || !displayName || !password) {
              return Response.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
            }
            if (password.length < 6) {
              return Response.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
            }
            const existing = await db.query.users.findFirst({ where: eq(users.username, username) })
            if (existing) {
              return Response.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 })
            }
            const passwordHash = await bcrypt.hash(password, 12)
            const [newUser] = await db.insert(users).values({
              username,
              displayName,
              passwordHash,
              role: role || 'MEMBER',
              status: status || 'ACTIVE',
              personId: personId || null,
              email: email || null,
            }).returning()

            // If sendEmail is checked and email is provided, send the credentials
            if (shouldSendEmail && email) {
              const subject = 'Thông tin tài khoản Tộc Phả Họ Đỗ Đàm An của bạn'
              const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2dcd0; border-radius: 16px; background-color: #fdfcfb; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 12px; margin-bottom: 20px;">
                    <h2 style="color: #634f38; font-family: serif; margin: 0; font-size: 22px;">Tộc Phả Họ Đỗ Đàm An</h2>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #8a7a65; letter-spacing: 1px; text-transform: uppercase;">Thông Tin Tài Khoản Mới</p>
                  </div>
                  
                  <p style="font-size: 15px; color: #4a3e3d; line-height: 1.6;">
                    Xin chào <strong>${displayName}</strong>,
                  </p>
                  
                  <p style="font-size: 15px; color: #4a3e3d; line-height: 1.6;">
                    Tài khoản của bạn trên hệ thống Tộc phả Họ Đỗ Đàm An đã được tạo thành công bởi Quản trị viên. Dưới đây là thông tin đăng nhập của bạn:
                  </p>
                  
                  <div style="background-color: #ffffff; padding: 18px; border-radius: 12px; border-left: 4px solid #d4af37; margin: 20px 0; color: #333333; line-height: 1.6; font-size: 15px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.01);">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #666; width: 140px;"><strong>Tên đăng nhập:</strong></td>
                        <td style="padding: 6px 0; color: #111;"><code>${username}</code></td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #666;"><strong>Mật khẩu:</strong></td>
                        <td style="padding: 6px 0; color: #111;"><code>${password}</code></td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 15px; color: #4a3e3d; line-height: 1.6;">
                    Vui lòng truy cập trang web tộc phả để đăng nhập. Sau khi đăng nhập thành công, bạn nên đổi mật khẩu trong phần <strong>Cài đặt tài khoản</strong> để bảo mật.
                  </p>
                  
                  <div style="margin-top: 30px; border-top: 1px solid #e2dcd0; padding-top: 15px; text-align: center;">
                    <p style="font-size: 11px; color: #999999; margin: 0;">
                      Đây là email gửi tự động từ địa chỉ <strong>${process.env.SMTP_USER || 'hethong@dodaman.id.vn'}</strong>. Vui lòng không trả lời trực tiếp email này.
                    </p>
                  </div>
                </div>
              `
              try {
                await sendEmail(email, subject, html, `Tài khoản của bạn đã được tạo.\nTên đăng nhập: ${username}\nMật khẩu: ${password}`)
                console.log(`[Credentials Sent] Successfully sent credentials to ${email}`)
              } catch (mailErr) {
                console.error('Failed to send credentials email:', mailErr)
              }
            }

            return Response.json({ user: { ...newUser, passwordHash: undefined } }, { status: 201 })
          }

          if (!userId) {
            return Response.json({ error: 'Thiếu userId' }, { status: 400 })
          }

          const updates: Record<string, unknown> = { updatedAt: new Date() }
          if (status) updates.status = status
          if (role) updates.role = role
          if (personId !== undefined) updates.personId = personId

          const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning()
          return Response.json({ user: { ...updated, passwordHash: undefined } })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    }
  }
})
