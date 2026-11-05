import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { memoryWall } from '~/db/schema'
import { getAuthUser } from '@/lib/auth'

export const Route = createFileRoute('/api/memories/$personId')({
  server: {
    handlers: {
  POST: async ({ params, request }) => {
    try {
      const payload = await getAuthUser(request)

      const body = await request.json()
      const { authorName, content } = body

      if (!content || !authorName) {
        return Response.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
      }

      const [memory] = await db.insert(memoryWall).values({
        personId: parseInt(params.personId),
        authorName,
        authorUserId: payload?.userId,
        content,
      }).returning()

      return Response.json({ memory }, { status: 201 })
    } catch (e) {
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
