import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { notifications } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/notifications/')({
  server: {
    handlers: {
  GET: async () => {
    const all = await db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)] })
    return Response.json({ notifications: all })
  },

  POST: async ({ request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    const body = await request.json()
    const [n] = await db.insert(notifications).values({ title: body.title, content: body.content }).returning()
    return Response.json({ notification: n }, { status: 201 })
  },

  PATCH: async ({ request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    const body = await request.json()
    const [n] = await db.update(notifications).set({ isActive: body.isActive }).where(eq(notifications.id, body.id)).returning()
    return Response.json({ notification: n })
  },
    }
  }
})
