import { db } from '~/db/client'
import { anniversaries } from '~/db/schema'
import { eq, and } from 'drizzle-orm'

const VIETNAMESE_MONTHS: Record<string, number> = {
  'giêng': 1, 'gieng': 1, 'một': 1, 'mot': 1, '1': 1, '01': 1,
  'hai': 2, '2': 2, '02': 2,
  'ba': 3, '3': 3, '03': 3,
  'tư': 4, 'tu': 4, 'bốn': 4, 'bon': 4, '4': 4, '04': 4,
  'năm': 5, 'nam': 5, '5': 5, '05': 5,
  'sáu': 6, 'sau': 6, '6': 6, '06': 6,
  'bảy': 7, 'bay': 7, 'bẩy': 7, '7': 7, '07': 7,
  'tám': 8, 'tam': 8, '8': 8, '08': 8,
  'chín': 9, 'chin': 9, '9': 9, '09': 9,
  'mười': 10, 'muoi': 10, '10': 10,
  'mười một': 11, 'muoi mot': 11, '11': 11,
  'mười hai': 12, 'muoi hai': 12, '12': 12, 'chạp': 12, 'chap': 12
}

export function parseLunarOrSolarDeathDate(dodLunar?: string | null, dod?: string | null): { dateType: 'SOLAR' | 'LUNAR'; day: number; month: number } | null {
  if (dodLunar) {
    const raw = dodLunar.trim().toLowerCase()
    // Format: 15/08 or 15-08 or 15/08/1954
    const slashMatch = raw.match(/(\d{1,2})[/-](\d{1,2})/)
    if (slashMatch) {
      const d = parseInt(slashMatch[1], 10)
      const m = parseInt(slashMatch[2], 10)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return { dateType: 'LUNAR', day: d, month: m }
      }
    }

    // Format: 07 tháng 3, 21 tháng giêng, 25 tháng chạp
    const textMatch = raw.match(/(\d{1,2})\s*tháng\s*([^\d\s\n\r,.-]+|\d+)/)
    if (textMatch) {
      const d = parseInt(textMatch[1], 10)
      const mStr = textMatch[2].trim()
      const m = VIETNAMESE_MONTHS[mStr] || (parseInt(mStr, 10) >= 1 && parseInt(mStr, 10) <= 12 ? parseInt(mStr, 10) : null)
      if (d >= 1 && d <= 31 && m) {
        return { dateType: 'LUNAR', day: d, month: m }
      }
    }
  }

  if (dod) {
    const raw = dod.trim()
    // Format: YYYY-MM-DD
    const isoMatch = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
      const d = parseInt(isoMatch[3], 10)
      const m = parseInt(isoMatch[2], 10)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return { dateType: 'SOLAR', day: d, month: m }
      }
    }

    // Format: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10)
      const m = parseInt(dmyMatch[2], 10)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return { dateType: 'SOLAR', day: d, month: m }
      }
    }
  }

  return null
}

export async function syncPersonDeathAnniversary(person: {
  id: number;
  name: string;
  isDeceased: boolean | null;
  dod: string | null;
  dodLunar: string | null;
  biography: string | null;
  generation: number;
}) {
  const parsed = person.isDeceased ? parseLunarOrSolarDeathDate(person.dodLunar, person.dod) : null

  // If not deceased, or no parseable death dates provided, remove any existing DEATH anniversary event
  if (!parsed) {
    await db.delete(anniversaries).where(
      and(
        eq(anniversaries.personId, person.id),
        eq(anniversaries.type, 'DEATH')
      )
    )
    return
  }

  const { dateType, day, month } = parsed

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
