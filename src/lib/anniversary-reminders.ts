import { sql } from 'drizzle-orm'
import { db } from '~/db/client'
import { anniversaryRemindersSent } from '~/db/schema'
import { lunarToSolar, nextOccurrence } from '@/lib/lunar-calendar'
import { broadcastPushNotification } from '@/lib/push-notifications'
import { sendEmail } from '@/lib/notifications'

/** Days before the event to remind: 3 days ahead to prepare, and the day itself. */
export const LEAD_DAYS = [3, 0]

const DAY_MS = 24 * 60 * 60 * 1000

interface AnniversaryLike {
  id: number
  title: string
  type: string
  dateType: string
  day: number
  month: number
  isRecurring: boolean
  year: number | null
  personId: number | null
}

export interface DueReminder<T extends AnniversaryLike> {
  anniversary: T
  occursOn: Date
  daysBefore: number
}

/** Today's calendar date in Vietnam, as a local-midnight Date (server runs in UTC). */
export function todayInVietnam(now = new Date()): Date {
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return new Date(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate())
}

function occurrence(a: AnniversaryLike, today: Date): Date | null {
  if (a.isRecurring || !a.year) return nextOccurrence(a.dateType, a.day, a.month, today)
  return a.dateType === 'LUNAR' ? lunarToSolar(a.day, a.month, a.year) : new Date(a.year, a.month - 1, a.day)
}

export function findDueReminders<T extends AnniversaryLike>(list: T[], today: Date, leadDays = LEAD_DAYS): DueReminder<T>[] {
  const due: DueReminder<T>[] = []
  for (const anniversary of list) {
    const occursOn = occurrence(anniversary, today)
    if (!occursOn) continue
    const daysBefore = Math.round((occursOn.getTime() - today.getTime()) / DAY_MS)
    if (leadDays.includes(daysBefore)) due.push({ anniversary, occursOn, daysBefore })
  }
  return due
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function describe(r: DueReminder<AnniversaryLike>) {
  const label = r.anniversary.type === 'DEATH' ? 'Ngày giỗ' : 'Sự kiện'
  const when = r.daysBefore === 0 ? 'hôm nay' : `còn ${r.daysBefore} ngày`
  const lunar = r.anniversary.dateType === 'LUNAR' ? ` (${r.anniversary.day}/${r.anniversary.month} âm lịch)` : ''
  const date = r.occursOn.toLocaleDateString('vi-VN')
  return {
    title: `${label}: ${r.anniversary.title}`,
    body: `${when[0].toUpperCase()}${when.slice(1)} — ${date}${lunar}`,
    url: r.anniversary.personId ? `/person/${r.anniversary.personId}` : '/anniversaries',
  }
}

/**
 * Send push + email reminders for events due today. Idempotent: each
 * (event, date, lead time) is recorded once, so running it hourly is safe.
 */
export async function runAnniversaryReminders(now = new Date()) {
  const today = todayInVietnam(now)
  const all = await db.query.anniversaries.findMany()
  const due = findDueReminders(all, today)

  let sent = 0
  for (const reminder of due) {
    const claimed = await db
      .insert(anniversaryRemindersSent)
      .values({
        anniversaryId: reminder.anniversary.id,
        occursOn: toIsoDate(reminder.occursOn),
        daysBefore: reminder.daysBefore,
      })
      .onConflictDoNothing()
      .returning()
    if (claimed.length === 0) continue

    const message = describe(reminder)
    await broadcastPushNotification({ ...message, tag: `anniversary-${reminder.anniversary.id}-${reminder.daysBefore}` })

    const recipients = await db.execute<{ email: string }>(
      sql`SELECT email FROM users WHERE status = 'ACTIVE' AND email_notifications = true AND email IS NOT NULL AND email <> ''`,
    )
    for (const { email } of recipients) {
      await sendEmail(email, message.title, `<p>${escapeHtml(message.body)}</p>`, message.body).catch((e) =>
        console.error('[Reminders] Email failed:', e.message),
      )
    }
    sent++
  }

  return { checked: all.length, due: due.length, sent }
}
