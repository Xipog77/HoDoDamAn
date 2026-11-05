import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { getAuthUser } from '@/lib/auth'
import { nextOccurrence } from '@/lib/lunar-calendar'
import { todayInVietnam } from '@/lib/anniversary-reminders'

const DAY_MS = 24 * 60 * 60 * 1000

// Events in the next `days` days, for admins deciding what to announce
export const Route = createFileRoute('/api/anniversaries/upcoming')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        const days = Math.min(parseInt(new URL(request.url).searchParams.get('days') || '30') || 30, 365)
        const today = todayInVietnam()
        const all = await db.query.anniversaries.findMany()

        const events = all
          .map((a) => {
            const occursOn = a.isRecurring || !a.year ? nextOccurrence(a.dateType, a.day, a.month, today) : null
            if (!occursOn) return null
            const daysUntil = Math.round((occursOn.getTime() - today.getTime()) / DAY_MS)
            if (daysUntil > days) return null
            return {
              id: a.id,
              title: a.title,
              type: a.type,
              dateType: a.dateType,
              day: a.day,
              month: a.month,
              personId: a.personId,
              description: a.description,
              occursOn: `${occursOn.getFullYear()}-${String(occursOn.getMonth() + 1).padStart(2, '0')}-${String(occursOn.getDate()).padStart(2, '0')}`,
              daysUntil,
            }
          })
          .filter((e) => e !== null)
          .sort((a, b) => a.daysUntil - b.daysUntil)

        return Response.json({ events })
      },
    },
  },
})
