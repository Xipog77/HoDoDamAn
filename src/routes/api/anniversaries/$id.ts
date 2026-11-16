import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { anniversaries, notifications } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

export const Route = createFileRoute('/api/anniversaries/$id')({
  server: {
    handlers: {
      DELETE: async ({ params, request }) => {
        try {
          const payload = await getAuthUser(request)
          if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền' }, { status: 403 })
          }

          const id = parseInt(params.id)
          if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
          // Linked notifications stay (they may already be sent); they just lose the event link
          await db.update(notifications).set({ anniversaryId: null }).where(eq(notifications.anniversaryId, id))
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
