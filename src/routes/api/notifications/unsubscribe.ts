import { createFileRoute } from '@tanstack/react-router'
import { removePushSubscription } from '@/lib/push-notifications'

export const Route = createFileRoute('/api/notifications/unsubscribe')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json()
          const { endpoint } = body

          if (!endpoint) {
            return Response.json(
              { error: 'Thiếu endpoint cần hủy đăng ký' },
              { status: 400 }
            )
          }

          await removePushSubscription(endpoint)

          return Response.json({
            success: true,
            message: 'Đã hủy nhận thông báo đẩy thành công',
          })
        } catch (error: any) {
          console.error('[Push] Unsubscribe error:', error)
          return Response.json(
            { error: error.message || 'Lỗi khi hủy đăng ký' },
            { status: 500 }
          )
        }
      },
    },
  },
})
