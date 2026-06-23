import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { postComments, users, persons } from '~/db/schema'
import { eq, desc, asc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/comments/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const postIdStr = url.searchParams.get('postId')
          if (!postIdStr) {
            return Response.json({ error: 'Thiếu postId' }, { status: 400 })
          }
          const postId = parseInt(postIdStr)

          // Fetch all comments for the post sorted by date
          const comments = await db.query.postComments.findMany({
            where: eq(postComments.postId, postId),
            orderBy: [asc(postComments.createdAt)]
          })

          // Enrich comments with user info
          const enriched = await Promise.all(comments.map(async c => {
            const user = await db.query.users.findFirst({
              where: eq(users.id, c.userId)
            })

            let avatarUrl = null
            if (user?.personId) {
              const p = await db.query.persons.findFirst({
                where: eq(persons.id, user.personId)
              })
              avatarUrl = p?.avatarUrl || null
            }

            return {
              ...c,
              authorName: user?.displayName || 'Thành viên',
              authorRole: user?.role || 'MEMBER',
              avatarUrl
            }
          }))

          // Nest replies inside their parent comments
          const roots = enriched.filter(c => !c.parentId)
          const replies = enriched.filter(c => c.parentId)

          const mapReplies = (parent: any) => {
            const children = replies.filter(r => r.parentId === parent.id)
            parent.replies = children.map(c => mapReplies(c))
            return parent
          }

          const nested = roots.map(r => mapReplies(r))

          return Response.json({ comments: nested })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload) {
          return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 })
        }

        try {
          const body = await request.json()
          if (!body.postId || !body.content || !body.content.trim()) {
            return Response.json({ error: 'Nội dung hoặc postId không hợp lệ' }, { status: 400 })
          }

          const [comment] = await db.insert(postComments).values({
            postId: parseInt(body.postId),
            userId: payload.userId,
            content: body.content,
            parentId: body.parentId ? parseInt(body.parentId) : null
          }).returning()

          return Response.json({ comment }, { status: 201 })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      }
    }
  }
})
