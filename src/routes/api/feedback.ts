import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { systemFeedbacks } from '~/db/schema'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/feedback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify Authentication
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload) {
          return Response.json({ error: 'Bạn phải đăng nhập để gửi góp ý' }, { status: 401 })
        }

        try {
          const body = await request.json()
          const { content } = body

          if (!content || content.trim().length === 0) {
            return Response.json({ error: 'Nội dung góp ý không được trống' }, { status: 400 })
          }

          const [entry] = await db.insert(systemFeedbacks).values({
            userId: payload.userId,
            authorName: payload.displayName,
            content: content.trim(),
            isResolved: false,
          }).returning()

          return Response.json({ success: true, feedback: entry }, { status: 201 })
        } catch (e: any) {
          console.error('Error submitting feedback:', e)
          return Response.json({ error: 'Lỗi server: ' + e.message }, { status: 500 })
        }
      },
    },
  },
})
