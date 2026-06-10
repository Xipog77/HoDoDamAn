import { createFileRoute } from '@tanstack/react-router'
import { clearAuthCookie } from '@/lib/auth'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
  POST: async () => {
    return new Response(JSON.stringify({ message: 'Đã đăng xuất' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearAuthCookie(),
      },
    })
  },
    }
  }
})
