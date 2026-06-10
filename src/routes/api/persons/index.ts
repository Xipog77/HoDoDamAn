import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { persons } from '~/db/schema'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/persons/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const search = url.searchParams.get('q') || ''
      const branch = url.searchParams.get('branch') || ''

      let all = await db.query.persons.findMany()

      if (search) {
        const q = search.toLowerCase()
        all = all.filter(p => p.name.toLowerCase().includes(q))
      }
      if (branch) {
        all = all.filter(p => p.branch === branch)
      }

      return Response.json({ persons: all })
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
      const [person] = await db.insert(persons).values(body).returning()
      return Response.json({ person }, { status: 201 })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi khi tạo hồ sơ' }, { status: 500 })
    }
  },
    }
  }
})
