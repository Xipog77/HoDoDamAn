import fs from 'fs'
import path from 'path'

interface Recipient {
  displayName?: string
  email?: string | null
  phone?: string | null
}

const LOG_DIR = '/app/uploads' // Path inside Docker container (mapped to host ./uploads)
const LOG_FILE = path.join(LOG_DIR, 'notifications.log')

export async function sendNotification(recipient: Recipient, title: string, content: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `
[NOTIFICATION DISPATCH]
Timestamp: ${timestamp}
Recipient: ${recipient.displayName || 'Unknown'} (Email: ${recipient.email || 'N/A'}, Phone: ${recipient.phone || 'N/A'})
Title: ${title}
Content: ${content}
----------------------------------------
`
  try {
    // Ensure uploads directory exists
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    // Append to file
    fs.appendFileSync(LOG_FILE, logMessage, 'utf-8')
    console.log(`[Notification Logged] to ${LOG_FILE} for ${recipient.displayName}`)
  } catch (err) {
    console.error('Failed to log notification:', err)
  }
}
