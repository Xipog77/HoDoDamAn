import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    const user = await getAuthUser(request)
    if (!user) return Response.json({ user: null })

    return Response.json({
      user: {
        id: user.userId,
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
