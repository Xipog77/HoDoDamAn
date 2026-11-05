import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { getAuthUser } from '@/lib/auth'
import { buildGedcom } from '@/lib/gedcom'

export const Route = createFileRoute('/api/admin/gedcom')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const payload = await getAuthUser(request)
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          const [allPersons, allMarriages] = await Promise.all([
            db.query.persons.findMany(),
            db.query.marriages.findMany(),
          ])
          const dateStr = new Date().toISOString().split('T')[0]
          return new Response(buildGedcom(allPersons, allMarriages), {
            headers: {
              'Content-Type': 'text/vnd.familysearch.gedcom; charset=utf-8',
              'Content-Disposition': `attachment; filename="giapha_${dateStr}.ged"`,
            },
          })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi khi xuất GEDCOM' }, { status: 500 })
        }
      },
    },
  },
})
