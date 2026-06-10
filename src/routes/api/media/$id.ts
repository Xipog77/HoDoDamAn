import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { media } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import * as fs from 'fs'
import * as path from 'path'

export const Route = createFileRoute('/api/media/$id')({
  server: {
    handlers: {
  DELETE: async ({ params, request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    const payload = token ? await verifyToken(token) : null
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
      return Response.json({ error: 'Không có quyền' }, { status: 403 })
    }

    try {
      const id = parseInt(params.id)
      const entry = await db.query.media.findFirst({ where: eq(media.id, id) })
      if (!entry) return Response.json({ error: 'Không tìm thấy' }, { status: 404 })

      // Delete local file if it was uploaded
      if (entry.source === 'UPLOAD' && entry.url.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), entry.url)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }

      await db.delete(media).where(eq(media.id, id))
      return Response.json({ success: true })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
