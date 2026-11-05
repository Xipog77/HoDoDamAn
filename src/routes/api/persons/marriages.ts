import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { marriages } from '~/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

async function isAdmin(request: Request) {
  const token = getTokenFromCookies(request.headers.get('cookie'))
  const payload = token ? await verifyToken(token) : null
  return !!payload && ['ADMIN', 'SUPER_ADMIN'].includes(payload.role)
}

export const Route = createFileRoute('/api/persons/marriages')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    if (!(await isAdmin(request))) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    try {
      const data = await request.json()
      const husbandId = parseInt(data.husbandId)
      const wifeId = parseInt(data.wifeId)

      if (!husbandId || !wifeId) {
        return Response.json({ error: 'Missing husbandId or wifeId' }, { status: 400 })
      }

      await db.insert(marriages).values({
        husbandId,
        wifeId,
      })

      return Response.json({ success: true })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
  DELETE: async ({ request }) => {
    if (!(await isAdmin(request))) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }
    try {
      const data = await request.json()
      const husbandId = parseInt(data.husbandId)
      const wifeId = parseInt(data.wifeId)

      if (!husbandId || !wifeId) {
        return Response.json({ error: 'Missing husbandId or wifeId' }, { status: 400 })
      }

      await db.delete(marriages).where(
        and(
          eq(marriages.husbandId, husbandId),
          eq(marriages.wifeId, wifeId)
        )
      )

      return Response.json({ success: true })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
