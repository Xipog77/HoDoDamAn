import { createFileRoute } from '@tanstack/react-router'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { broadcastPushNotification } from '@/lib/push-notifications'
import { db } from '~/db/client'
import { pushSubscriptions } from '~/db/schema'

export const Route = createFileRoute('/api/notifications/test-push')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }
        const count = await db.$count(pushSubscriptions)
        return Response.json({ subscribersCount: count })
      },
      POST: async ({ request }: { request: Request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        const body = await request.json()
        const title = body.title || 'Thử nghiệm Thông Báo Đẩy'
        const content =
          body.body ||
          body.content ||
          'Đây là thông báo thử nghiệm từ hệ thống Quản Lý Dòng Họ Đàm An.'
        const url = body.url || '/'

        const result = await broadcastPushNotification({
          title,
          body: content,
          url,
        })

        return Response.json({
          success: true,
          ...result,
        })
      },
    },
  },
})
