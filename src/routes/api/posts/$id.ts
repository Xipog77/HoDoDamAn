import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { posts, users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { sanitizeRichText } from '@/lib/sanitize'

export const Route = createFileRoute('/api/posts/$id')({
  server: {
    handlers: {
  GET: async ({ params }) => {
    try {
      const id = parseInt(params.id)
      if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
      const post = await db.query.posts.findFirst({ where: eq(posts.id, id) })
      if (!post) return Response.json({ error: 'Không tìm thấy bài viết' }, { status: 404 })

      const author = await db.query.users.findFirst({ where: eq(users.id, post.authorId) })
      return Response.json({ post: { ...post, authorName: author?.displayName || 'Admin' } })
    } catch (e) {
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },

  DELETE: async ({ params, request }) => {
    const payload = await getAuthUser(request)
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
    await db.delete(posts).where(eq(posts.id, id))
    return Response.json({ success: true })
  },

  POST: async ({ params, request }) => {
    const payload = await getAuthUser(request)
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }

    try {
      const id = parseInt(params.id)
      if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
      const body = await request.json()
      const { id: _id, authorId: _authorId, createdAt: _createdAt, ...fields } = body
      if (typeof fields.content === 'string') fields.content = sanitizeRichText(fields.content)
      const [updated] = await db.update(posts).set({ ...fields, updatedAt: new Date() }).where(eq(posts.id, id)).returning()
      const author = await db.query.users.findFirst({ where: eq(users.id, updated.authorId) })
      return Response.json({ post: { ...updated, authorName: author?.displayName || 'Admin' } })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
