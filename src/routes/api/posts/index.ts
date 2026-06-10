import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { posts, users } from '~/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/posts/')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const featured = url.searchParams.get('featured') === 'true'

      let allPosts = await db.query.posts.findMany({ orderBy: [desc(posts.createdAt)] })
      if (featured) allPosts = allPosts.filter(p => p.isFeatured)

      // Add author names
      const enriched = await Promise.all(allPosts.map(async post => {
        const author = await db.query.users.findFirst({ where: eq(users.id, post.authorId) })
        return { ...post, authorName: author?.displayName || 'Admin' }
      }))

      return Response.json({ posts: enriched })
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
      const [post] = await db.insert(posts).values({ ...body, authorId: payload.userId }).returning()
      return Response.json({ post }, { status: 201 })
    } catch (e) {
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
