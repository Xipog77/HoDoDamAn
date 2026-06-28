import { db } from '~/db/client'
import { anniversaries } from '~/db/schema'
import { eq, and } from 'drizzle-orm'

export async function syncPersonDeathAnniversary(person: {
  id: number;
  name: string;
  isDeceased: boolean | null;
  dod: string | null;
  dodLunar: string | null;
  biography: string | null;
  generation: number;
}) {
  // If not deceased, or no death dates provided, remove any existing DEATH anniversary event
  if (!person.isDeceased || (!person.dod && !person.dodLunar)) {
    await db.delete(anniversaries).where(
      and(
        eq(anniversaries.personId, person.id),
        eq(anniversaries.type, 'DEATH')
      )
    )
    return
  }

  let day: number | null = null
  let month: number | null = null
  let dateType: 'SOLAR' | 'LUNAR' = 'SOLAR'

  if (person.dodLunar) {
    dateType = 'LUNAR'
    // Parse lunar string format: e.g. "15/08/1954" or "15/08"
    const match = person.dodLunar.trim().match(/^(\d{1,2})[/-](\d{1,2})/)
    if (match) {
      day = parseInt(match[1], 10)
      month = parseInt(match[2], 10)
    }
  } else if (person.dod) {
    dateType = 'SOLAR'
    // Parse solar date string format: "YYYY-MM-DD"
    const parts = person.dod.split('-')
    if (parts.length >= 3) {
      day = parseInt(parts[2], 10)
      month = parseInt(parts[1], 10)
    }
  }

  // If we couldn't parse day and month, remove any existing event and exit
  if (day === null || month === null || isNaN(day) || isNaN(month)) {
    await db.delete(anniversaries).where(
      and(
        eq(anniversaries.personId, person.id),
        eq(anniversaries.type, 'DEATH')
      )
    )
    return
  }

  // Find if there is an existing DEATH anniversary for this person
  const existing = await db.query.anniversaries.findFirst({
    where: and(
      eq(anniversaries.personId, person.id),
      eq(anniversaries.type, 'DEATH')
    )
  })

  const title = `Ngày giỗ cụ ${person.name}`
  const description = person.biography || `Ngày giỗ của cụ ${person.name} thuộc đời thứ ${person.generation} dòng họ Đỗ Đàm An.`

  if (existing) {
    // Update existing event details
    await db.update(anniversaries)
      .set({
        title,
        day,
        month,
        dateType,
        description,
        updatedAt: new Date()
      })
      .where(eq(anniversaries.id, existing.id))
  } else {
    // Create new event
    await db.insert(anniversaries).values({
      title,
      type: 'DEATH',
      dateType,
      day,
      month,
      description,
      personId: person.id,
      isRecurring: true
    })
  }
}
