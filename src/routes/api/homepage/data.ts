import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { users, notifications, posts } from '~/db/schema'
import { getUpcomingDeathAnniversaries } from '@/lib/lunar-calendar'
import { and, eq, desc } from 'drizzle-orm'

export const Route = createFileRoute('/api/homepage/data')({
  server: {
    handlers: {
  GET: async () => {
    try {
      const [featuredPosts, allNotifications, allPersons] = await Promise.all([
        db.query.posts.findMany({
          columns: {
            id: true,
            title: true,
            excerpt: true,
            authorId: true,
            isFeatured: true,
            coverImage: true,
            createdAt: true,
            updatedAt: true
          },
          where: eq(posts.isFeatured, true),
          orderBy: [desc(posts.createdAt)]
        }),
        db.query.notifications.findMany({
          columns: { id: true, title: true, content: true, url: true, createdAt: true },
          where: and(eq(notifications.isActive, true), eq(notifications.status, 'SENT'), eq(notifications.audience, 'ALL')),
          orderBy: [desc(notifications.createdAt)],
          limit: 5,
        }),
        db.query.persons.findMany(),
      ])

      // Enrich featured posts with author names
      const enrichedPosts = await Promise.all(
        featuredPosts.slice(0, 3).map(async post => {
          const author = await db.query.users.findFirst({ where: eq(users.id, post.authorId) })
          return { ...post, authorName: author?.displayName || 'Admin' }
        })
      )

      const upcoming = getUpcomingDeathAnniversaries(
        allPersons.map(p => ({ id: p.id, name: p.name, dod: p.dod, dodLunar: p.dodLunar }))
      )

      return Response.json({
        featuredPosts: enrichedPosts,
        notifications: allNotifications.slice(0, 5),
        upcomingAnniversaries: upcoming.slice(0, 5),
        stats: {
          totalPersons: allPersons.length,
          generations: Math.max(...allPersons.map(p => p.generation || 1), 1),
        },
      })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi server' }, { status: 500 })
    }
  },
    }
  }
})
