import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { media } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { checkDiskSpace } from '@/lib/system'
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

    // Check disk space safety
    const diskInfo = checkDiskSpace()
    if (diskInfo && diskInfo.isCritical) {
      return Response.json(
        { error: `Tải lên bị chặn: Dung lượng máy chủ gần đầy (chỉ còn ${diskInfo.availableGb} GB trống). Vui lòng dọn dẹp hệ thống.` },
        { status: 507 }
      )
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

      const personIdVal = formData.get('personId')
      const postIdVal = formData.get('postId')
      const caption = formData.get('caption')
      const type = (formData.get('type') as string) || 'others'

      const personId = personIdVal ? parseInt(personIdVal as string) : null
      const postId = postIdVal ? parseInt(postIdVal as string) : null

      // Clean/sanitize filename
      const sanitizeFilename = (name: string): string => {
        const ext = name.split('.').pop() || 'bin'
        const base = name.substring(0, name.lastIndexOf('.')) || name
        
        let str = base.toLowerCase()
        str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        str = str.replace(/[đĐ]/g, "d")
        str = str.replace(/[^a-z0-9.-]/g, "-")
        str = str.replace(/-+/g, "-")
        str = str.replace(/^-+|-+$/g, "")
        
        return `${str}.${ext.toLowerCase()}`
      }

      const sanitized = sanitizeFilename(file.name)
      const ext = sanitized.split('.').pop() || 'bin'

      let finalFilename = sanitized
      if (type === 'portrait' && personId) {
        finalFilename = `portrait-person-${personId}.${ext}`
      } else if (type === 'portrait') {
        finalFilename = `portrait-${sanitized}`
      } else if (type === 'archive' && personId) {
        finalFilename = `archive-person-${personId}-${sanitized}`
      } else if (type === 'archive') {
        finalFilename = `archive-${sanitized}`
      } else if (type === 'posts' && postId) {
        finalFilename = `post-${postId}-${sanitized}`
      } else if (type === 'posts') {
        finalFilename = `post-${sanitized}`
      } else if (type === 'carousel') {
        finalFilename = `carousel-${sanitized}`
      } else if (type === 'background') {
        finalFilename = `background-${sanitized}`
      } else {
        finalFilename = `${type}-${sanitized}`
      }

      // Map to subfolder
      let subFolder = 'others'
      if (['archive', 'background', 'portrait', 'carousel', 'posts'].includes(type)) {
        subFolder = type
      }

      const subfolderPath = path.join(process.cwd(), 'uploads', subFolder)
      if (!fs.existsSync(subfolderPath)) fs.mkdirSync(subfolderPath, { recursive: true })

      const filePath = path.join(subfolderPath, finalFilename)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)

      const fileUrl = `/uploads/${subFolder}/${finalFilename}`

      const [entry] = await db.insert(media).values({
        filename: file.name,
        url: fileUrl,
        mimeType: file.type || null,
        source: 'UPLOAD',
        personId: personId && !isNaN(personId) ? personId : null,
        postId: postId && !isNaN(postId) ? postId : null,
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
