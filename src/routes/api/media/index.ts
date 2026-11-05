import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { media } from '~/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { checkDiskSpace } from '@/lib/system'
import * as fs from 'fs'
import * as path from 'path'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'pdf', 'mp4', 'webm', 'mp3', 'm4a'])
const UPLOAD_TYPES = ['archive', 'background', 'portrait', 'carousel', 'posts', 'others']

export const Route = createFileRoute('/api/media/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const personId = url.searchParams.get('personId')
      const postId = url.searchParams.get('postId')

      const filters = []
      if (personId) filters.push(eq(media.personId, parseInt(personId)))
      if (postId) filters.push(eq(media.postId, parseInt(postId)))

      const allMedia = await db.query.media.findMany({
        where: filters.length ? and(...filters) : undefined,
        orderBy: [desc(media.createdAt)],
      })

      return Response.json({ media: allMedia })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },

  POST: async ({ request }) => {
    const payload = await getAuthUser(request)
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

      if (file.size > MAX_UPLOAD_BYTES) {
        return Response.json({ error: `Tệp quá lớn (tối đa ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` }, { status: 413 })
      }

      const sanitized = sanitizeFilename(file.name)
      const ext = sanitized.split('.').pop() || 'bin'
      // Only media/document types: an uploaded .html or .svg would run script on our origin
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return Response.json({ error: `Không hỗ trợ định dạng .${ext}` }, { status: 415 })
      }
      if (!UPLOAD_TYPES.includes(type)) {
        return Response.json({ error: 'Loại tải lên không hợp lệ' }, { status: 400 })
      }

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
      const subFolder = type === 'others' ? 'others' : type

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
