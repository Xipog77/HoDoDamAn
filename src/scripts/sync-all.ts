import { db } from '../../db/client'
import { anniversaries } from '../../db/schema'
import { syncPersonDeathAnniversary } from '../lib/sync-anniversaries'

async function run() {
  console.log('Starting death anniversaries synchronization for all existing ancestor profiles...')
  
  try {
    const allPersons = await db.query.persons.findMany()
    console.log(`Found ${allPersons.length} profiles to scan.`)

    let syncCount = 0
    for (const person of allPersons) {
      if (person.isDeceased && (person.dod || person.dodLunar)) {
        await syncPersonDeathAnniversary({
          id: person.id,
          name: person.name,
          isDeceased: person.isDeceased,
          dod: person.dod,
          dodLunar: person.dodLunar,
          biography: person.biography,
          generation: person.generation,
        })
        syncCount++
      }
    }

    // Ensure clan annual event: Rằm tháng 7 - Giỗ tổ Họ Đỗ Đàm An
    const existingClanEvent = await db.query.anniversaries.findFirst({
      where: (ann, { and, eq }) => and(
        eq(ann.day, 15),
        eq(ann.month, 7),
        eq(ann.dateType, 'LUNAR')
      )
    })

    if (!existingClanEvent) {
      await db.insert(anniversaries).values({
        title: 'Giỗ tổ Họ Đỗ Đàm An (Rằm tháng Bảy)',
        type: 'COMMEMORATION',
        dateType: 'LUNAR',
        day: 15,
        month: 7,
        description: 'Đại lễ Giỗ tổ truyền thống hàng năm của Chi tộc Họ Đỗ Đàm An vào ngày Rằm tháng 7 Âm lịch. Con cháu khắp mọi miền quy tụ về từ đường dâng hương tri ân tiên tổ.',
        personId: 1,
        isRecurring: true
      })
      console.log('Added annual event: Giỗ tổ Họ Đỗ Đàm An (Rằm tháng Bảy) 🎉')
    }

    console.log(`Successfully synchronized ${syncCount} deceased ancestor profiles to the anniversaries table! 🎉`)
    process.exit(0)
  } catch (error) {
    console.error('Error synchronizing death anniversaries:', error)
    process.exit(1)
  }
}

run()
