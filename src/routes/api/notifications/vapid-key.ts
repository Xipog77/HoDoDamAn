import { createFileRoute } from '@tanstack/react-router'
import { VAPID_PUBLIC_KEY } from '@/lib/push-notifications'

export const Route = createFileRoute('/api/notifications/vapid-key')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          publicKey: VAPID_PUBLIC_KEY,
        })
      },
    },
  },
})
