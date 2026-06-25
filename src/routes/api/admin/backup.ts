import { createFileRoute } from '@tanstack/react-router'
import { db } from '~/db/client'
import * as schema from '~/db/schema'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

export const Route = createFileRoute('/api/admin/backup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // 1. Verify Authentication & Role
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
          return Response.json({ error: 'Không có quyền' }, { status: 403 })
        }

        try {
          console.log('Starting full data backup...')

          // 2. Query all tables from the database
          const dataBackup: Record<string, any[]> = {}
          
          const tablesToBackup = [
            { name: 'users', schemaObj: schema.users },
            { name: 'persons', schemaObj: schema.persons },
            { name: 'marriages', schemaObj: schema.marriages },
            { name: 'posts', schemaObj: schema.posts },
            { name: 'postComments', schemaObj: schema.postComments },
            { name: 'galleries', schemaObj: schema.galleries },
            { name: 'familyFund', schemaObj: schema.familyFund },
            { name: 'memoryWall', schemaObj: schema.memoryWall },
            { name: 'editRequests', schemaObj: schema.editRequests },
            { name: 'notifications', schemaObj: schema.notifications },
            { name: 'media', schemaObj: schema.media },
            { name: 'homeCarouselSlides', schemaObj: schema.homeCarouselSlides },
            { name: 'anniversaries', schemaObj: schema.anniversaries },
          ]

          for (const table of tablesToBackup) {
            try {
              // @ts-ignore
              const records = await db.select().from(table.schemaObj)
              dataBackup[table.name] = records
            } catch (err: any) {
              console.error(`Error backing up table ${table.name}:`, err.message)
              dataBackup[table.name] = []
            }
          }

          // 3. Write database backup JSON to a file
          const dbBackupPath = path.resolve('backup_db.json')
          fs.writeFileSync(dbBackupPath, JSON.stringify(dataBackup, null, 2), 'utf-8')

          // 4. Compress database JSON and uploads directory into backup.tar.gz
          const archivePath = path.resolve('backup.tar.gz')
          const uploadsPath = path.resolve('uploads')
          
          // Ensure uploads directory exists so tar command doesn't error out
          if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true })
          }

          console.log('Compiling tarball archive...')
          // Use standard tar command to create tar.gz archive
          execSync(`tar -czf "${archivePath}" "backup_db.json" "uploads/"`)

          // 5. Send file stream as response
          const fileStream = fs.createReadStream(archivePath)
          
          // Set hook to delete temp files after client finishes downloading
          fileStream.on('close', () => {
            try {
              if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
              if (fs.existsSync(dbBackupPath)) fs.unlinkSync(dbBackupPath)
              console.log('Temporary backup files cleaned up successfully.')
            } catch (cleanupErr: any) {
              console.error('Error during backup cleanup:', cleanupErr.message)
            }
          })

          const dateStr = new Date().toISOString().split('T')[0]
          return new Response(fileStream as any, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `attachment; filename="giapha_backup_${dateStr}.tar.gz"`,
            },
          })

        } catch (error: any) {
          console.error('Backup error:', error)
          return Response.json({ error: 'Lỗi trong quá trình tạo bản sao lưu: ' + error.message }, { status: 500 })
        }
      },
    },
  },
})
