import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { notificationDeliveries, notifications } from '~/db/schema'
import { and, eq, desc, inArray } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { dispatchNotification } from '@/lib/notification-center'

async function requireAdmin(request: Request) {
  const payload = await getAuthUser(request)
  return payload && ['ADMIN', 'SUPER_ADMIN'].includes(payload.role) ? payload : null
}

const forbidden = () => Response.json({ error: 'Không có quyền' }, { status: 403 })
const bad = (error: string) => Response.json({ error }, { status: 400 })

/** Validate the editable fields shared by create and update. */
function parseFields(body: any) {
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()
  if (!title || !content) return { error: 'Thiếu tiêu đề hoặc nội dung' }
  if (title.length > 300) return { error: 'Tiêu đề tối đa 300 ký tự' }

  const audience = body.audience === 'USERS' ? 'USERS' : 'ALL'
  const recipientUserIds = audience === 'USERS'
    ? [...new Set((Array.isArray(body.recipientUserIds) ? body.recipientUserIds : []).map(Number).filter(Number.isInteger))] as number[]
    : null
  if (audience === 'USERS' && recipientUserIds!.length === 0) return { error: 'Chọn ít nhất một người nhận' }

  const sendEmail = !!body.sendEmail
  const sendPush = !!body.sendPush
  // Targeted notifications are private, so they never go on the public homepage
  const isActive = audience === 'ALL' && body.showOnHomepage !== false
  if (!sendEmail && !sendPush && !isActive) return { error: 'Chọn ít nhất một kênh gửi' }

  const url = typeof body.url === 'string' && body.url.startsWith('/') ? body.url.slice(0, 500) : null

  const mode = ['now', 'schedule', 'draft'].includes(body.mode) ? body.mode : 'now'
  let scheduledAt: Date | null = null
  if (mode === 'schedule') {
    scheduledAt = new Date(body.scheduledAt)
    if (isNaN(scheduledAt.getTime())) return { error: 'Thời gian hẹn gửi không hợp lệ' }
    if (scheduledAt.getTime() < Date.now() - 60_000) return { error: 'Thời gian hẹn gửi phải ở tương lai' }
  }
  const status = mode === 'schedule' ? 'SCHEDULED' : 'DRAFT'

  return { mode, values: { title, content, audience, recipientUserIds, sendEmail, sendPush, isActive, url, scheduledAt, status } }
}

export const Route = createFileRoute('/api/notifications/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requireAdmin(request))) {
          // Public view: only what is already shown on the homepage
          const visible = await db.query.notifications.findMany({
            columns: { id: true, title: true, content: true, url: true, createdAt: true },
            where: and(eq(notifications.isActive, true), eq(notifications.status, 'SENT'), eq(notifications.audience, 'ALL')),
            orderBy: [desc(notifications.createdAt)],
          })
          return Response.json({ notifications: visible })
        }
        const all = await db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)] })
        return Response.json({ notifications: all })
      },

      POST: async ({ request }) => {
        const admin = await requireAdmin(request)
        if (!admin) return forbidden()

        const parsed = parseFields(await request.json())
        if ('error' in parsed) return bad(parsed.error!)

        const [n] = await db
          .insert(notifications)
          .values({ ...parsed.values, kind: 'MANUAL', createdBy: admin.userId })
          .returning()

        const result = parsed.mode === 'now' ? await dispatchNotification(n.id) : n
        return Response.json({ notification: result ?? n }, { status: 201 })
      },

      PATCH: async ({ request }) => {
        if (!(await requireAdmin(request))) return forbidden()
        const body = await request.json()
        const id = Number(body.id)
        const existing = await db.query.notifications.findFirst({ where: eq(notifications.id, id) })
        if (!existing) return Response.json({ error: 'Không tìm thấy thông báo' }, { status: 404 })

        switch (body.action) {
          case 'toggle': {
            if (existing.audience !== 'ALL') return bad('Thông báo gửi riêng không hiển thị trên trang chủ')
            const [n] = await db.update(notifications)
              .set({ isActive: !existing.isActive, updatedAt: new Date() })
              .where(eq(notifications.id, id)).returning()
            return Response.json({ notification: n })
          }
          case 'cancel': {
            const [n] = await db.update(notifications)
              .set({ status: 'DRAFT', scheduledAt: null, updatedAt: new Date() })
              .where(and(eq(notifications.id, id), eq(notifications.status, 'SCHEDULED'))).returning()
            if (!n) return bad('Chỉ huỷ được thông báo đang hẹn giờ')
            return Response.json({ notification: n })
          }
          case 'send': {
            const n = await dispatchNotification(id)
            if (!n) return bad('Thông báo đã gửi hoặc đang gửi')
            return Response.json({ notification: n })
          }
          case 'update': {
            if (!['DRAFT', 'SCHEDULED', 'FAILED'].includes(existing.status)) return bad('Không sửa được thông báo đã gửi')
            const parsed = parseFields(body)
            if ('error' in parsed) return bad(parsed.error!)
            const [n] = await db.update(notifications)
              .set({ ...parsed.values, updatedAt: new Date() })
              .where(and(eq(notifications.id, id), inArray(notifications.status, ['DRAFT', 'SCHEDULED', 'FAILED']))).returning()
            if (!n) return bad('Thông báo vừa được gửi, không sửa được')
            const result = parsed.mode === 'now' ? await dispatchNotification(id) : n
            return Response.json({ notification: result ?? n })
          }
          default:
            return bad('Hành động không hợp lệ')
        }
      },

      DELETE: async ({ request }) => {
        if (!(await requireAdmin(request))) return forbidden()
        const id = parseInt(new URL(request.url).searchParams.get('id') || '')
        if (!id) return bad('Thiếu ID')
        await db.delete(notificationDeliveries).where(eq(notificationDeliveries.notificationId, id))
        await db.delete(notifications).where(eq(notifications.id, id))
        return Response.json({ success: true })
      },
    },
  },
})
