import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { systemFeedbacks } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/admin/feedback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify Authentication & Admin Role
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          const feedbacks = await db.query.systemFeedbacks.findMany({
            orderBy: [desc(systemFeedbacks.createdAt)],
          })
          return Response.json({ feedbacks })
        } catch (e: any) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        // Verify Authentication & Admin Role
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          const body = await request.json()
          const { action, feedbackId } = body

          if (!feedbackId) {
            return Response.json({ error: 'Thiếu ID góp ý' }, { status: 400 })
          }

          if (action === 'RESOLVE') {
            const [updated] = await db
              .update(systemFeedbacks)
              .set({ isResolved: true })
              .where(eq(systemFeedbacks.id, parseInt(feedbackId)))
              .returning()
            return Response.json({ success: true, feedback: updated })
          }

          if (action === 'DELETE') {
            await db.delete(systemFeedbacks).where(eq(systemFeedbacks.id, parseInt(feedbackId)))
            return Response.json({ success: true })
          }

          return Response.json({ error: 'Hành động không hợp lệ' }, { status: 400 })
        } catch (e: any) {
          console.error(e)
          return Response.json({ error: 'Lỗi server: ' + e.message }, { status: 500 })
        }
      },
    },
  },
})
