import { and, eq, inArray } from 'drizzle-orm'
import { db } from '~/db/client'
import { anniversaryRemindersSent, users } from '~/db/schema'
import { lunarToSolar, nextOccurrence } from '@/lib/lunar-calendar'
import { broadcastPushNotification } from '@/lib/push-notifications'
import { sendEmail } from '@/lib/notifications'

/**
 * Days before an event on which admins are alerted. Admins then decide whether and
 * how to announce it to the family (homepage, push, email) from /admin/notifications.
 */
export const LEAD_DAYS = [7, 3, 1]

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

/** Vietnamese one-liner for an event, shared by the admin alert and the upcoming list. */
export function describeEvent(a: AnniversaryLike, occursOn: Date, daysUntil: number) {
  const label = a.type === 'DEATH' ? 'Giỗ' : 'Sự kiện'
  const when = daysUntil === 0 ? 'hôm nay' : `còn ${daysUntil} ngày`
  const lunar = a.dateType === 'LUNAR' ? ` (${a.day}/${a.month} âm lịch)` : ''
  return `${label} ${a.title} — ${occursOn.toLocaleDateString('vi-VN')}${lunar}, ${when}`
}

/**
 * Alert admins (push to their own devices + email) about events coming up, so they
 * can decide how to announce them. Nothing is sent to other members automatically.
 * Idempotent: each (event, date, lead time) is claimed once, so running hourly is safe.
 */
export async function runAdminEventAlerts(now = new Date()) {
  const today = todayInVietnam(now)
  const all = await db.query.anniversaries.findMany()
  const due = findDueReminders(all, today)

  const fresh: DueReminder<AnniversaryLike>[] = []
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
    if (claimed.length > 0) fresh.push(reminder)
  }
  if (fresh.length === 0) return { checked: all.length, due: due.length, alerted: 0 }

  const lines = fresh
    .sort((a, b) => a.daysBefore - b.daysBefore)
    .map((r) => describeEvent(r.anniversary, r.occursOn, r.daysBefore))
  const title = fresh.length === 1 ? 'Sự kiện sắp tới cần thông báo' : `${fresh.length} sự kiện sắp tới cần thông báo`
  const body = lines.join('\n')
  const url = fresh.length === 1
    ? `/admin/notifications?event=${fresh[0].anniversary.id}`
    : '/admin/notifications'

  const admins = await db.query.users.findMany({
    where: and(eq(users.status, 'ACTIVE'), inArray(users.role, ['ADMIN', 'SUPER_ADMIN'])),
  })
  for (const admin of admins) {
    await broadcastPushNotification({ title, body, url, tag: `admin-events-${toIsoDate(today)}` }, { targetUserId: admin.id })
    if (admin.email) {
      const html = `<p>${lines.map(escapeHtml).join('<br>')}</p>` +
        `<p>Vào <strong>Quản trị → Thông báo</strong> để quyết định có gửi thông báo cho dòng họ hay không.</p>`
      await sendEmail(admin.email, title, html, body).catch((e) =>
        console.error('[Event alerts] Email failed:', e.message),
      )
    }
  }

  return { checked: all.length, due: due.length, alerted: fresh.length, admins: admins.length }
}
