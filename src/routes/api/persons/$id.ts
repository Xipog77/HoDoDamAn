import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { persons, marriages, memoryWall, anniversaries } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { syncPersonDeathAnniversary } from '@/lib/sync-anniversaries'

async function updateDescendantsGeneration(parentId: number, parentGeneration: number, visited = new Set<number>()) {
  if (visited.has(parentId)) return
  visited.add(parentId)
  const children = await db.query.persons.findMany({ where: eq(persons.fatherId, parentId) })
  for (const child of children) {
    const childGen = parentGeneration + 1
    await db.update(persons).set({ generation: childGen, updatedAt: new Date() }).where(eq(persons.id, child.id))
    await updateDescendantsGeneration(child.id, childGen, visited)
  }
}

export const Route = createFileRoute('/api/persons/$id')({
  server: {
    handlers: {
  GET: async ({ params, request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || (payload.status !== 'ACTIVE' && !['ADMIN', 'SUPER_ADMIN'].includes(payload.role))) {
      return Response.json({ error: 'Bạn cần đăng nhập bằng tài khoản thành viên hoạt động để xem thông tin' }, { status: 403 })
    }

    try {
      const id = parseInt(params.id)
      if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
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
    if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })

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

      let finalGeneration: number | null = null
      let currentPerson: any = null

      if (isAdmin) {
        currentPerson = await db.query.persons.findFirst({ where: eq(persons.id, id) })
        if (!currentPerson) return Response.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 })

        updateData = { ...body }

        const targetFatherId = body.fatherId !== undefined ? body.fatherId : currentPerson.fatherId
        finalGeneration = currentPerson.generation

        if (targetFatherId) {
          const father = await db.query.persons.findFirst({ where: eq(persons.id, targetFatherId) })
          if (father) {
            finalGeneration = father.generation + 1
            updateData.generation = finalGeneration
            // Inherit branch if not set or empty
            if (updateData.branch === undefined && !currentPerson.branch) {
              updateData.branch = father.branch
            } else if (updateData.branch === '') {
              updateData.branch = father.branch
            }
          }
        } else if (targetFatherId === null) {
          if (updateData.generation !== undefined) {
            finalGeneration = updateData.generation
          }
        }
      } else {
        updateData = { fullBiography: body.fullBiography }
      }

      updateData.updatedAt = new Date()

      const updated = await db.update(persons).set(updateData).where(eq(persons.id, id)).returning()

      if (updated[0]) {
        await syncPersonDeathAnniversary(updated[0])
      }

      if (isAdmin && currentPerson && finalGeneration !== null && finalGeneration !== currentPerson.generation) {
        await updateDescendantsGeneration(id, finalGeneration)
      }

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
      if (isNaN(id)) return Response.json({ error: 'ID không hợp lệ' }, { status: 400 })
      await db.delete(anniversaries).where(eq(anniversaries.personId, id))
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
