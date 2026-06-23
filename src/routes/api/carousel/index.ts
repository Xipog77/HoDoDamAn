import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { homeCarouselSlides } from '~/db/schema'
import { asc, eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/carousel/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const showAll = url.searchParams.get('all') === '1'

          const slides = await db.query.homeCarouselSlides.findMany({
            orderBy: [asc(homeCarouselSlides.order)]
          })

          // For public homepage: only active slides; for admin: all slides
          const filtered = showAll ? slides : slides.filter(s => s.isActive)
          return Response.json({ slides: filtered })
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
          if (!body.imageUrl) {
            return Response.json({ error: 'Thiếu đường dẫn hình ảnh' }, { status: 400 })
          }

          const [slide] = await db.insert(homeCarouselSlides).values({
            imageUrl: body.imageUrl,
            title: body.title || null,
            description: body.description || null,
            order: body.order ? parseInt(body.order) : 0,
            isActive: body.isActive !== undefined ? body.isActive : true
          }).returning()

          return Response.json({ slide }, { status: 201 })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      PATCH: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          const body = await request.json()
          if (!body.id) {
            return Response.json({ error: 'Thiếu ID slide' }, { status: 400 })
          }

          const updateData: any = {}
          if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
          if (body.title !== undefined) updateData.title = body.title
          if (body.description !== undefined) updateData.description = body.description
          if (body.order !== undefined) updateData.order = parseInt(body.order)
          if (body.isActive !== undefined) updateData.isActive = body.isActive

          const [updated] = await db.update(homeCarouselSlides)
            .set(updateData)
            .where(eq(homeCarouselSlides.id, body.id))
            .returning()

          return Response.json({ slide: updated })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      }
    }
  }
})
