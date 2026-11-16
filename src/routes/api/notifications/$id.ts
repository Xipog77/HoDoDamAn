import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { notificationDeliveries, notifications, users } from '~/db/schema'
import { asc, eq, inArray } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

export const Route = createFileRoute('/api/notifications/$id')({
  server: {
    handlers: {
      // Detail for the notification center: who it targets and every delivery attempt
      GET: async ({ request, params }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }
        const id = Number(params.id)
        const notification = await db.query.notifications.findFirst({ where: eq(notifications.id, id) })
        if (!notification) return Response.json({ error: 'Không tìm thấy' }, { status: 404 })

        const deliveries = await db
          .select({
            id: notificationDeliveries.id,
            userId: notificationDeliveries.userId,
            userName: users.displayName,
            channel: notificationDeliveries.channel,
            target: notificationDeliveries.target,
            status: notificationDeliveries.status,
            error: notificationDeliveries.error,
            createdAt: notificationDeliveries.createdAt,
          })
          .from(notificationDeliveries)
          .leftJoin(users, eq(users.id, notificationDeliveries.userId))
          .where(eq(notificationDeliveries.notificationId, id))
          .orderBy(asc(notificationDeliveries.id))

        const recipients = notification.audience === 'USERS' && notification.recipientUserIds?.length
          ? await db
              .select({ id: users.id, displayName: users.displayName, username: users.username, email: users.email })
              .from(users)
              .where(inArray(users.id, notification.recipientUserIds))
          : []

        const creator = notification.createdBy
          ? await db.query.users.findFirst({ columns: { displayName: true }, where: eq(users.id, notification.createdBy) })
          : null

        return Response.json({ notification, recipients, deliveries, createdByName: creator?.displayName ?? null })
      },
    },
  },
})
