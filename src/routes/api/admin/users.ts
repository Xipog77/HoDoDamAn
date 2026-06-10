import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
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
          const { action, userId, username, displayName, password, role, status, personId } = body

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
            }).returning()
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
