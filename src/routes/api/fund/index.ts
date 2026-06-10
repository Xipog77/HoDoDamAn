import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { familyFund } from '~/db/schema'
import { desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/fund/')({
  server: {
    handlers: {
  GET: async () => {
    try {
      const records = await db.query.familyFund.findMany({ orderBy: [desc(familyFund.createdAt)] })
      const total = records.reduce((sum, r) => r.type === 'IN' ? sum + r.amount : sum - r.amount, 0)
      return Response.json({ records, total })
    } catch (e) {
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },

  POST: async ({ request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }

    try {
      const body = await request.json()
      const [record] = await db.insert(familyFund).values({ ...body, recordedBy: payload.userId }).returning()
      return Response.json({ record }, { status: 201 })
    } catch (e) {
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
