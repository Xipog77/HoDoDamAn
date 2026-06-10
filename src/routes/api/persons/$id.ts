import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { persons, marriages, memoryWall } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/persons/$id')({
  server: {
    handlers: {
  GET: async ({ params }) => {
    try {
      const id = parseInt(params.id)
      const person = await db.query.persons.findFirst({ where: eq(persons.id, id) })
      if (!person) return Response.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 })

      const father = person.fatherId ? await db.query.persons.findFirst({ where: eq(persons.id, person.fatherId) }) : null
      const mother = person.motherId ? await db.query.persons.findFirst({ where: eq(persons.id, person.motherId) }) : null
      const children = await db.query.persons.findMany({ where: eq(persons.fatherId, id) })
      const daughterChildren = await db.query.persons.findMany({ where: eq(persons.motherId, id) })

      const marriageList = await db.query.marriages.findMany({
        where: person.gender === 'MALE'
          ? eq(marriages.husbandId, id)
          : eq(marriages.wifeId, id)
      })

      const spouseIds = marriageList.map(m => person.gender === 'MALE' ? m.wifeId : m.husbandId)
      const spouses = await Promise.all(spouseIds.map(sid => db.query.persons.findFirst({ where: eq(persons.id, sid) })))

      const memories = await db.query.memoryWall.findMany({ where: eq(memoryWall.personId, id) })

      return Response.json({
        person,
        father,
        mother,
        spouses: spouses.filter(Boolean),
        children: [...children, ...daughterChildren],
        memories,
      })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },

  POST: async ({ params, request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    const id = parseInt(params.id)

    if (!payload) {
      return Response.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(payload.role)
    const isSelf = payload.personId === id

    if (!isAdmin && !isSelf) {
      return Response.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    try {
      const body = await request.json()
      let updateData: any = {}

      if (isAdmin) {
        updateData = { ...body }
      } else {
        updateData = { fullBiography: body.fullBiography }
      }

      updateData.updatedAt = new Date()

      const updated = await db.update(persons).set(updateData).where(eq(persons.id, id)).returning()
      return Response.json({ person: updated[0] })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },

  DELETE: async ({ params, request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền truy cập' }, { status: 403 })
    }

    try {
      const id = parseInt(params.id)
      await db.delete(persons).where(eq(persons.id, id))
      return Response.json({ success: true })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
