import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { editRequests, persons } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/persons/request-edit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['MEMBER', 'ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Vui lòng đăng nhập để gửi yêu cầu' }, { status: 401 })
        }

        try {
          const body = await request.json()
          const { personId, changes, note } = body

          if (!personId || !changes || Object.keys(changes).length === 0) {
            return Response.json({ error: 'Thiếu thông tin chỉnh sửa' }, { status: 400 })
          }

          const targetPerson = await db.query.persons.findFirst({
            where: eq(persons.id, parseInt(personId)),
          })

          if (!targetPerson) {
            return Response.json({ error: 'Không tìm thấy hồ sơ thành viên' }, { status: 404 })
          }

          const changesWithNote = {
            ...changes,
            _requesterNote: note || '',
            _requestedAt: new Date().toISOString(),
          }

          const [entry] = await db
            .insert(editRequests)
            .values({
              personId: parseInt(personId),
              requesterId: payload.userId,
              changes: changesWithNote,
              status: 'PENDING',
            })
            .returning()

          return Response.json({ success: true, requestId: entry.id })
        } catch (e: any) {
          console.error(e)
          return Response.json({ error: 'Lỗi server: ' + e.message }, { status: 500 })
        }
      },
    },
  },
})
