import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { persons } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/persons/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || (payload.status !== 'ACTIVE' && !['ADMIN', 'SUPER_ADMIN'].includes(payload.role))) {
      return Response.json({ error: 'Bạn cần đăng nhập bằng tài khoản thành viên hoạt động để xem thông tin' }, { status: 403 })
    }

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

      // Automatically calculate generation and inherit branch from father if set
      if (body.fatherId) {
        const father = await db.query.persons.findFirst({ where: eq(persons.id, body.fatherId) })
        if (father) {
          body.generation = father.generation + 1
          if (!body.branch) {
            body.branch = father.branch
          }
        }
      } else {
        if (body.generation === undefined) {
          body.generation = 1
        }
      }

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
