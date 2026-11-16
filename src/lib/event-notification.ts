import { lunarToSolar, nextOccurrence } from '@/lib/lunar-calendar'

export interface EventLike {
  id: number
  title: string
  type: string
  dateType: string
  day: number
  month: number
  isRecurring: boolean
  year: number | null
  personId: number | null
  description?: string | null
}

/** How many days before the event the suggested notification goes out, and at what hour. */
export const SUGGEST_DAYS_BEFORE = 3
export const SUGGEST_HOUR = 8

/** Next solar date of the event on/after `from` (one-time events: their own date, or null if past). */
export function eventOccurrence(ev: EventLike, from = new Date()): Date | null {
  if (ev.isRecurring || !ev.year) return nextOccurrence(ev.dateType, ev.day, ev.month, from)
  const d = ev.dateType === 'LUNAR' ? lunarToSolar(ev.day, ev.month, ev.year) : new Date(ev.year, ev.month - 1, ev.day)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return d && d >= today ? d : null
}

/**
 * Pre-filled notification for an event: title/content/link, plus a suggested send time
 * (SUGGEST_DAYS_BEFORE days ahead at SUGGEST_HOUR:00; falls back to the day itself, or
 * null when both are already past so the admin sends it right away).
 */
export function draftFromEvent(ev: EventLike, now = new Date()) {
  const occursOn = eventOccurrence(ev, now)
  const label = ev.type === 'DEATH' ? 'Ngày giỗ' : ev.type === 'COMMEMORATION' ? 'Ngày kỷ niệm' : 'Sự kiện'
  const lunar = ev.dateType === 'LUNAR' ? ` (ngày ${ev.day}/${ev.month} âm lịch)` : ''
  const when = occursOn ? occursOn.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' }) : `ngày ${ev.day}/${ev.month}`

  let scheduledAt: Date | null = null
  if (occursOn) {
    for (const daysBefore of [SUGGEST_DAYS_BEFORE, 0]) {
      const at = new Date(occursOn.getFullYear(), occursOn.getMonth(), occursOn.getDate() - daysBefore, SUGGEST_HOUR)
      if (at > now) {
        scheduledAt = at
        break
      }
    }
  }

  const description = ev.description?.trim()
  return {
    title: `${label}: ${ev.title}`.slice(0, 300),
    content: `${label} ${ev.title} vào ${when}${lunar}.${description ? `\n${description}` : ''}`,
    url: ev.personId ? `/person/${ev.personId}` : '/anniversaries',
    occursOn,
    scheduledAt,
  }
}
