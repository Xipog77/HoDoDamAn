import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth'
import { db } from '~/db/client'
import { pushSubscriptions } from '~/db/schema'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/notifications/push-stats')({
  server: {
    handlers: {
      // Number of devices subscribed to push, shown in the notification center
      GET: async ({ request }: { request: Request }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }
        // db.$count() only exists in drizzle-orm >= 0.34
        const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pushSubscriptions)
        return Response.json({ subscribersCount: count })
      },
    },
  },
})
