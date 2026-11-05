import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth'
import {
  savePushSubscription,
  sendNotificationToSubscription,
} from '@/lib/push-notifications'

export const Route = createFileRoute('/api/notifications/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const payload = await getAuthUser(request)
          const userId = payload ? payload.userId : null

          const body = await request.json()
          const { subscription, userAgent } = body

          if (!subscription || !subscription.endpoint || !subscription.keys) {
            return Response.json(
              { error: 'Dữ liệu PushSubscription không đầy đủ' },
              { status: 400 }
            )
          }

          const saved = await savePushSubscription({
            userId,
            subscription,
            userAgent: userAgent || request.headers.get('user-agent') || undefined,
          })

          // Send an immediate welcome test notification to verify setup
          try {
            await sendNotificationToSubscription(
              {
                id: saved.id,
                endpoint: saved.endpoint,
                p256dh: saved.p256dh,
                auth: saved.auth,
              },
              {
                title: 'Họ Đỗ Đàm An',
                body: 'Thiết bị của bạn đã được kết nối nhận thông báo đẩy thành công! 🔔',
                url: '/',
              }
            )
          } catch (pushErr) {
            console.warn('[Push] Welcome push warning:', pushErr)
          }

          return Response.json({
            success: true,
            id: saved.id,
            message: 'Đăng ký nhận thông báo đẩy thành công',
          })
        } catch (error: any) {
          console.error('[Push] Subscribe error:', error)
          return Response.json(
            { error: error.message || 'Lỗi lưu thông tin đăng ký' },
            { status: 500 }
          )
        }
      },
    },
  },
})
