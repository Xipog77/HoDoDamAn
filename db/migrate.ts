import 'dotenv/config'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const url = process.env.DATABASE_URL.trim()
  console.log('Running migrations...')
  
  const sql = postgres(url, { max: 1 })

  // Create migrations tracking table
  await sql`
    CREATE SCHEMA IF NOT EXISTS drizzle
  `
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT,
      name TEXT,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `

  // Read migration files
  const migrationsDir = './db/migrations'
  const migrationItems: Array<{ name: string; path: string }> = []
  
  const entries = readdirSync(migrationsDir)
  for (const entry of entries) {
    const fullPath = join(migrationsDir, entry)
    if (entry.endsWith('.sql')) {
      migrationItems.push({ name: entry, path: fullPath })
    } else {
      const migrationPath = join(fullPath, 'migration.sql')
      if (existsSync(migrationPath)) {
        migrationItems.push({ name: entry, path: migrationPath })
      }
    }
  }
  
  migrationItems.sort((a, b) => a.name.localeCompare(b.name))

  // Get already applied migrations
  const applied = await sql`
    SELECT name FROM drizzle.__drizzle_migrations
  `
  const appliedNames = new Set(applied.map(r => r.name))

  for (const item of migrationItems) {
    if (appliedNames.has(item.name)) {
      console.log(`  ✓ ${item.name} (already applied)`)
      continue
    }

    const migrationSql = readFileSync(item.path, 'utf-8')
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`  → Applying ${item.name}...`)
    try {
      for (const stmt of statements) {
        try {
          await sql.unsafe(stmt)
        } catch (stmtErr: any) {
          const msg = stmtErr.message || ''
          if (msg.includes('already exists') || msg.includes('collides with existing') || msg.includes('duplicate')) {
            console.log(`    (Notice: skipped statement: ${msg.trim()})`)
          } else {
            throw stmtErr
          }
        }
      }
      await sql`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)
        VALUES (${item.name}, ${Date.now()}, ${item.name})
      `
      console.log(`  ✓ ${item.name} applied`)
    } catch (err) {
      console.error(`  ✗ Failed to apply ${item.name}:`, err)
      throw err
    }
  }

  console.log('Migrations completed.')
  await sql.end()
  process.exit(0)
}

runMigration().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
