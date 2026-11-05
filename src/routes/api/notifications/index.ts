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
    // Each channel is the admin's choice. `broadcast` is the older all-or-nothing flag.
    const channels = {
      web: body.channels?.web ?? true,
      push: body.channels?.push ?? !!body.broadcast,
      email: body.channels?.email ?? !!body.broadcast,
    }

    // The row is the homepage announcement; when web is off it is kept hidden as a record
    const [n] = await db
      .insert(notifications)
      .values({ title: body.title, content: body.content, isActive: channels.web })
      .returning()

    let recipientCount = 0
    let pushResult: { totalSent: number; successCount: number; failureCount: number } | null = null

    if (channels.email) {
      try {
        const activeUsers = await db.query.users.findMany({
          where: (users, { eq }) => eq(users.status, 'ACTIVE')
        })
        const { sendNotification } = await import('@/lib/notifications')
        for (const u of activeUsers) {
          if (u.emailNotifications && u.email) {
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
    }

    if (channels.push) {
      try {
        const { broadcastPushNotification } = await import('@/lib/push-notifications')
        pushResult = await broadcastPushNotification({
          title: n.title,
          body: n.content,
          url: body.url || '/'
        })
      } catch (pushErr) {
        console.error('Web push broadcast error:', pushErr)
      }
    }

    return Response.json({ notification: n, recipientCount, pushResult }, { status: 201 })
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
