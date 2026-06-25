import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from './client'
import { users } from './schema'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Resetting database (wiping all tables and restarting IDs)...')

  const tables = [
    'edit_requests',
    'family_fund',
    'galleries',
    'marriages',
    'memory_wall',
    'notifications',
    'persons',
    'posts',
    'post_comments',
    'users',
    'media',
    'home_carousel_slides',
    'anniversaries',
  ]

  for (const table of tables) {
    console.log(`  → Truncating table: ${table}...`)
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`))
    } catch (e: any) {
      console.error(`  ✗ Failed to truncate table "${table}":`, e.message)
      throw e
    }
  }

  console.log('Database reset complete.')
  console.log('Creating initial SUPER_ADMIN account...')

  const username = process.env.ADMIN_ACC || 'admin'
  const password = process.env.ADMIN_PASS || 'admin123'
  
  // Hash the password with bcryptjs
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await db.insert(users).values({
      username,
      displayName: 'Quản trị viên',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    })

    console.log('================================================')
    console.log('🎉 Database seeded successfully!')
    console.log(`   - Username: ${username}`)
    console.log(`   - Password: ${password}`)
    console.log('================================================')
  } catch (e: any) {
    console.error('  ✗ Failed to create admin user:', e.message)
    throw e
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
