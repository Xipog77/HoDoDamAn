import 'dotenv/config'
import { db } from '../../db/client'
import { persons } from '../../db/schema'
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

    console.log(`Successfully synchronized ${syncCount} deceased ancestor profiles to the anniversaries table! 🎉`)
    process.exit(0)
  } catch (error) {
    console.error('Error synchronizing death anniversaries:', error)
    process.exit(1)
  }
}

run()
