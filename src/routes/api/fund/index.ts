import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { familyFund } from '~/db/schema'
import { desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/fund/')({
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
          const page = parseInt(url.searchParams.get('page') || '1')
          const limit = parseInt(url.searchParams.get('limit') || '10')
          const q = url.searchParams.get('q') || ''

          const allRecords = await db.query.familyFund.findMany({ 
            orderBy: [desc(familyFund.date), desc(familyFund.createdAt)] 
          })

          const totalBalance = allRecords.reduce((sum, r) => r.type === 'IN' ? sum + r.amount : sum - r.amount, 0)
          const totalIn = allRecords.filter(r => r.type === 'IN').reduce((sum, r) => sum + r.amount, 0)
          const totalOut = allRecords.filter(r => r.type === 'OUT').reduce((sum, r) => sum + r.amount, 0)

          let filtered = allRecords
          if (q) {
            const query = q.toLowerCase()
            filtered = allRecords.filter(r => r.description.toLowerCase().includes(query))
          }

          const totalRecords = filtered.length
          const totalPages = Math.ceil(totalRecords / limit)
          const offset = (page - 1) * limit
          const pageRecords = filtered.slice(offset, offset + limit)

          const enrichedRecords = await Promise.all(pageRecords.map(async r => {
            let personName = null
            if (r.personId) {
              const p = await db.query.persons.findFirst({
                where: (persons, { eq }) => eq(persons.id, r.personId!)
              })
              personName = p ? p.name : null
            }
            return {
              ...r,
              personName
            }
          }))

          return Response.json({
            records: enrichedRecords,
            total: totalBalance,
            totalIn,
            totalOut,
            pagination: {
              page,
              limit,
              totalRecords,
              totalPages
            }
          })
        } catch (e) {
          console.error(e)
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
          const pId = body.personId ? parseInt(body.personId) : null
          const [record] = await db.insert(familyFund).values({ 
            type: body.type,
            amount: body.amount,
            description: body.description,
            date: body.date,
            personId: pId,
            recordedBy: payload.userId 
          }).returning()
          return Response.json({ record }, { status: 201 })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },
    }
  }
})
