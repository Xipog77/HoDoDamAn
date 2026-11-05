import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { notifications } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

export const Route = createFileRoute('/api/notifications/')({
  server: {
    handlers: {
  GET: async () => {
    const all = await db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)] })
    return Response.json({ notifications: all })
  },

  POST: async ({ request }) => {
    const payload = await getAuthUser(request)
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    const body = await request.json()
    const [n] = await db.insert(notifications).values({ title: body.title, content: body.content }).returning()

    let recipientCount = 0

    // Broadcast to users only if explicitly requested
    if (body.broadcast) {
      try {
        const activeUsers = await db.query.users.findMany({
          where: (users, { eq }) => eq(users.status, 'ACTIVE')
        })
        const { sendNotification } = await import('@/lib/notifications')
        for (const u of activeUsers) {
          if (u.emailNotifications && (u.email || u.phone)) {
            sendNotification(
              { displayName: u.displayName, email: u.email, phone: u.phone },
              n.title,
              n.content
            ).catch(console.error)
            recipientCount++
          }
        }
      } catch (err) {
        console.error('Email broadcast error:', err)
      }

      // Also broadcast Web Push to all subscribed PWA devices
      try {
        const { broadcastPushNotification } = await import('@/lib/push-notifications')
        await broadcastPushNotification({
          title: n.title,
          body: n.content,
          url: '/'
        })
      } catch (pushErr) {
        console.error('Web push broadcast error:', pushErr)
      }
    }

    return Response.json({ notification: n, recipientCount }, { status: 201 })
  },

  PATCH: async ({ request }) => {
    const payload = await getAuthUser(request)
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    const body = await request.json()
    const [n] = await db.update(notifications).set({ isActive: body.isActive }).where(eq(notifications.id, body.id)).returning()
    return Response.json({ notification: n })
  },

  DELETE: async ({ request }) => {
    const payload = await getAuthUser(request)
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return Response.json({ error: 'Thiếu ID' }, { status: 400 })
    }
    await db.delete(notifications).where(eq(notifications.id, parseInt(id)))
    return Response.json({ success: true })
  },
    }
  }
})
