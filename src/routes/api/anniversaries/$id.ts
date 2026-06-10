import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { anniversaries } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/anniversaries/$id')({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        try {
          const token = getTokenFromCookies(request.headers.get('cookie'))
          const payload = token ? await verifyToken(token) : null
          if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền' }, { status: 403 })
          }

          const id = parseInt(params.id)
          await db.delete(anniversaries).where(eq(anniversaries.id, id))
          return Response.json({ success: true })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    }
  }
})
