import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const token = getTokenFromCookies(request.headers.get('cookie'))
    if (!token) return Response.json({ user: null })

    const payload = await verifyToken(token)
    if (!payload) return Response.json({ user: null })

    const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) })
    if (!user) return Response.json({ user: null })

    return Response.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        personId: user.personId,
      },
    })
  },
    }
  }
})
