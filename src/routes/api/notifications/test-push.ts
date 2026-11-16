import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth'
import { dispatchNotification } from '@/lib/notification-center'
import { db } from '~/db/client'
import { notifications, pushSubscriptions } from '~/db/schema'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/notifications/test-push')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }
        // db.$count() only exists in drizzle-orm >= 0.34
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pushSubscriptions)
        return Response.json({ subscribersCount: count })
      },
      POST: async ({ request }: { request: Request }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        const body = await request.json()
        // Logged as a TEST notification so it shows up (with per-device results) in the center
        const [n] = await db
          .insert(notifications)
          .values({
            kind: 'TEST',
            title: String(body.title || 'Thử nghiệm Thông Báo Đẩy').slice(0, 300),
            content: String(body.body || body.content || 'Đây là thông báo thử nghiệm từ hệ thống Quản Lý Dòng Họ Đàm An.'),
            url: '/',
            isActive: false,
            audience: 'ALL',
            sendPush: true,
            status: 'DRAFT',
            createdBy: payload.userId,
          })
          .returning()
        const sent = await dispatchNotification(n.id)
        const push = sent?.stats?.push ?? { sent: 0, failed: 0 }

        return Response.json({
          success: true,
          notificationId: n.id,
          totalSent: push.sent + push.failed,
          successCount: push.sent,
          failureCount: push.failed,
        })
      },
    },
  },
})
