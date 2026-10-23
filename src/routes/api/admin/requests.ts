import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { editRequests, persons, users } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/admin/requests')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền truy cập' }, { status: 403 })
        }

        try {
          const allRequests = await db.query.editRequests.findMany({
            orderBy: [desc(editRequests.createdAt)],
          })

          const enriched = await Promise.all(
            allRequests.map(async req => {
              const [person, requester] = await Promise.all([
                db.query.persons.findFirst({
                  where: eq(persons.id, req.personId),
                  columns: { id: true, name: true, generation: true, branch: true, avatarUrl: true },
                }),
                db.query.users.findFirst({
                  where: eq(users.id, req.requesterId),
                  columns: { id: true, username: true, displayName: true },
                }),
              ])

              return {
                ...req,
                personName: person?.name || 'Đã xóa',
                personGeneration: person?.generation || null,
                personBranch: person?.branch || null,
                requesterName: requester?.displayName || requester?.username || 'Ẩn danh',
              }
            })
          )

          return Response.json({ requests: enriched })
        } catch (e: any) {
          console.error(e)
          return Response.json({ error: 'Lỗi server: ' + e.message }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền truy cập' }, { status: 403 })
        }

        try {
          const body = await request.json()
          const { action, requestId } = body

          if (!requestId || !action) {
            return Response.json({ error: 'Thiếu thông tin' }, { status: 400 })
          }

          const targetRequest = await db.query.editRequests.findFirst({
            where: eq(editRequests.id, parseInt(requestId)),
          })

          if (!targetRequest) {
            return Response.json({ error: 'Không tìm thấy yêu cầu' }, { status: 404 })
          }

          if (action === 'APPROVE') {
            const rawChanges = (targetRequest.changes || {}) as Record<string, any>
            // Filter out metadata fields
            const cleanChanges: Record<string, any> = {}
            for (const [key, val] of Object.entries(rawChanges)) {
              if (!key.startsWith('_')) {
                cleanChanges[key] = val
              }
            }

            // Apply updates to persons table
            if (Object.keys(cleanChanges).length > 0) {
              await db
                .update(persons)
                .set({ ...cleanChanges, updatedAt: new Date() })
                .where(eq(persons.id, targetRequest.personId))
            }

            // Mark request as APPROVED
            const [updated] = await db
              .update(editRequests)
              .set({
                status: 'APPROVED',
                reviewedBy: payload.userId,
              })
              .where(eq(editRequests.id, parseInt(requestId)))
              .returning()

            return Response.json({ success: true, request: updated })
          }

          if (action === 'REJECT') {
            const [updated] = await db
              .update(editRequests)
              .set({
                status: 'REJECTED',
                reviewedBy: payload.userId,
              })
              .where(eq(editRequests.id, parseInt(requestId)))
              .returning()

            return Response.json({ success: true, request: updated })
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
