import { createFileRoute } from '@tanstack/react-router'
import bcrypt from 'bcryptjs'
import { db } from '~/db/client'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'


export const Route = createFileRoute('/api/auth/register')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { username, displayName, password } = body

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
      const [user] = await db.insert(users).values({
        username,
        displayName,
        passwordHash,
        role: 'MEMBER',
        status: 'PENDING',
      }).returning()

      return Response.json({
        message: 'Đăng ký thành công! Tài khoản của bạn đang chờ Admin duyệt.',
        userId: user.id,
      })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }, { status: 500 })
    }
  },
    }
  }
})
