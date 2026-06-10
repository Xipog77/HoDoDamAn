import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { media } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import * as fs from 'fs'
import * as path from 'path'

export const Route = createFileRoute('/api/media/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const personId = url.searchParams.get('personId')
      const postId = url.searchParams.get('postId')

      let allMedia = await db.query.media.findMany({ orderBy: [desc(media.createdAt)] })

      if (personId) allMedia = allMedia.filter(m => m.personId === parseInt(personId))
      if (postId) allMedia = allMedia.filter(m => m.postId === parseInt(postId))

      return Response.json({ media: allMedia })
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
      const contentType = request.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        // External URL embed
        const body = await request.json()
        const [entry] = await db.insert(media).values({
          filename: body.filename || 'external',
          url: body.url,
          mimeType: body.mimeType || null,
          source: 'EXTERNAL',
          personId: body.personId ? parseInt(body.personId) : null,
          postId: body.postId ? parseInt(body.postId) : null,
          caption: body.caption || null,
          uploadedBy: payload.userId,
        }).returning()
        return Response.json({ media: entry }, { status: 201 })
      }

      // File upload via FormData
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

      const uploadsDir = path.join(process.cwd(), 'uploads')
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

      const ext = file.name.split('.').pop() || 'bin'
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = path.join(uploadsDir, uniqueName)

      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)

      const fileUrl = `/uploads/${uniqueName}`
      const personId = formData.get('personId')
      const postId = formData.get('postId')
      const caption = formData.get('caption')

      const [entry] = await db.insert(media).values({
        filename: file.name,
        url: fileUrl,
        mimeType: file.type || null,
        source: 'UPLOAD',
        personId: personId ? parseInt(personId as string) : null,
        postId: postId ? parseInt(postId as string) : null,
        caption: caption ? (caption as string) : null,
        uploadedBy: payload.userId,
      }).returning()

      return Response.json({ media: entry }, { status: 201 })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
