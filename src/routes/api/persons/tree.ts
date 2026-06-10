import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import { persons, marriages } from '~/db/schema'

export const Route = createFileRoute('/api/persons/tree')({
  server: {
    handlers: {
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const branch = url.searchParams.get('branch')
      // Fetch all male persons (main tree nodes) + marriage info
      let allPersons = await db.query.persons.findMany()
      let allMarriages = await db.query.marriages.findMany()

      if (branch) {
        allPersons = allPersons.filter(p => p.branch === branch)
      }

      // Build tree structure: nodes (male) with spouses/children
      const nodes: TreeNode[] = []
      const edges: TreeEdge[] = []

      const malePersons = allPersons.filter(p => p.gender === 'MALE')

      for (const person of malePersons) {
        // Find spouses
        const marriageList = allMarriages.filter(m => m.husbandId === person.id)
        const spouses = marriageList
          .map(m => allPersons.find(p => p.id === m.wifeId))
          .filter(Boolean)

        // Find children
        const children = allPersons.filter(p => p.fatherId === person.id)

        nodes.push({
          id: `person-${person.id}`,
          type: 'personNode',
          data: {
            id: person.id,
            name: person.name,
            gender: person.gender,
            birthYear: person.birthYear,
            deathYear: person.deathYear,
            avatarUrl: person.avatarUrl,
            generation: person.generation || 1,
            branch: person.branch,
            biography: person.biography,
            isDeceased: person.isDeceased,
            spouses: spouses.map(s => s ? { id: s.id, name: s.name, avatarUrl: s.avatarUrl } : null).filter(Boolean),
            children: children.map(c => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl, gender: c.gender })),
          },
          position: { x: 0, y: 0 },
        })

        // Parent -> Child edges
        if (person.fatherId) {
          edges.push({
            id: `edge-${person.fatherId}-${person.id}`,
            source: `person-${person.fatherId}`,
            target: `person-${person.id}`,
            type: 'smoothstep',
            style: { stroke: '#8B4513', strokeWidth: 2 },
          })
        }
      }

      return Response.json({ nodes, edges, totalPersons: allPersons.length })
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Lỗi khi tải dữ liệu cây gia phả' }, { status: 500 })
    }
  },
    }
  }
})

interface TreeNode {
  id: string
  type: string
  data: {
    id: number
    name: string
    gender: string
    birthYear: number | null
    deathYear: number | null
    avatarUrl: string | null
    generation: number
    branch: string | null
    biography: string | null
    isDeceased: boolean | null
    spouses: Array<{ id: number; name: string; avatarUrl: string | null }>
    children: Array<{ id: number; name: string; avatarUrl: string | null; gender: string }>
  }
  position: { x: number; y: number }
}

interface TreeEdge {
  id: string
  source: string
  target: string
  type: string
  style: { stroke: string; strokeWidth: number }
}
