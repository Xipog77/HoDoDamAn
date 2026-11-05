import { createFileRoute } from '@tanstack/react-router'
import { getAuthUser } from '@/lib/auth'
import { checkDiskSpace } from '@/lib/system'

export const Route = createFileRoute('/api/admin/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify Authentication & Admin Role
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        const diskInfo = checkDiskSpace()
        if (!diskInfo) {
          return Response.json({ error: 'Không thể kiểm tra dung lượng ổ đĩa' }, { status: 500 })
        }

        return Response.json({ diskInfo })
      },
    },
  },
})
