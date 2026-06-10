import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { anniversaries } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/anniversaries/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const all = await db.query.anniversaries.findMany({ 
            orderBy: [desc(anniversaries.createdAt)] 
          })
          return Response.json({ anniversaries: all })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        try {
          const token = getTokenFromCookies(request.headers.get('cookie'))
          const payload = token ? await verifyToken(token) : null
          if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền' }, { status: 403 })
          }

          const body = await request.json()
          if (!body.title || !body.day || !body.month || !body.type) {
            return Response.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
          }

          const [newAnniversary] = await db.insert(anniversaries).values({
            title: body.title,
            type: body.type,
            dateType: body.dateType || 'SOLAR',
            day: parseInt(body.day),
            month: parseInt(body.month),
            description: body.description || null,
            personId: body.personId ? parseInt(body.personId) : null,
            postId: body.postId ? parseInt(body.postId) : null,
            isRecurring: body.isRecurring !== undefined ? Boolean(body.isRecurring) : true,
            year: body.year ? parseInt(body.year) : null,
          }).returning()

          return Response.json({ anniversary: newAnniversary }, { status: 201 })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      PATCH: async ({ request }) => {
        try {
          const token = getTokenFromCookies(request.headers.get('cookie'))
          const payload = token ? await verifyToken(token) : null
          if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền' }, { status: 403 })
          }

          const body = await request.json()
          if (!body.id || !body.title || !body.day || !body.month || !body.type) {
            return Response.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
          }

          const [updated] = await db.update(anniversaries)
            .set({
              title: body.title,
              type: body.type,
              dateType: body.dateType,
              day: parseInt(body.day),
              month: parseInt(body.month),
              description: body.description || null,
              personId: body.personId ? parseInt(body.personId) : null,
              postId: body.postId ? parseInt(body.postId) : null,
              isRecurring: body.isRecurring !== undefined ? Boolean(body.isRecurring) : true,
              year: body.year ? parseInt(body.year) : null,
              updatedAt: new Date(),
            })
            .where(eq(anniversaries.id, body.id))
            .returning()

          return Response.json({ anniversary: updated })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    }
  }
})
