import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { postComments } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/comments/$id')({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload) {
          return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 })
        }

        try {
          const id = parseInt(params.id)
          const comment = await db.query.postComments.findFirst({
            where: eq(postComments.id, id)
          })

          if (!comment) {
            return Response.json({ error: 'Không tìm thấy bình luận' }, { status: 404 })
          }

          // Check if author or admin
          if (comment.userId !== payload.userId && !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền xóa bình luận này' }, { status: 403 })
          }

          // Also delete replies if any (recursive or cascade - let's delete any comment where parentId matches this comment id)
          await db.delete(postComments).where(eq(postComments.parentId, id))
          await db.delete(postComments).where(eq(postComments.id, id))

          return Response.json({ success: true })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      }
    }
  }
})
