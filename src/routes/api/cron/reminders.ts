import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'node:crypto'
import { getAuthUser } from '@/lib/auth'
import { runAdminEventAlerts } from '@/lib/anniversary-reminders'

// server.js generates INTERNAL_CRON_TOKEN at startup and calls this route hourly
function isInternalCall(request: Request) {
  const expected = process.env.INTERNAL_CRON_TOKEN
  const given = request.headers.get('x-internal-token')
  if (!expected || !given || given.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export const Route = createFileRoute('/api/cron/reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isInternalCall(request)) {
          const payload = await getAuthUser(request)
          if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
            return Response.json({ error: 'Không có quyền' }, { status: 403 })
          }
        }

        try {
          const result = await runAdminEventAlerts()
          return Response.json(result)
        } catch (e) {
          console.error('[Reminders] Run failed:', e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    },
  },
})
