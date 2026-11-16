import { describe, expect, it } from 'vitest'
import { draftFromEvent, eventOccurrence } from '@/lib/event-notification'

const base = { id: 1, title: 'Cụ Tổ', type: 'DEATH', dateType: 'SOLAR', day: 20, month: 11, isRecurring: true, year: null, personId: 7 }

describe('draftFromEvent', () => {
  it('suggests 3 days before at 08:00 and links to the person', () => {
    const d = draftFromEvent(base, new Date(2026, 10, 1, 12))
    expect(d.occursOn).toEqual(new Date(2026, 10, 20))
    expect(d.scheduledAt).toEqual(new Date(2026, 10, 17, 8))
    expect(d.title).toBe('Ngày giỗ: Cụ Tổ')
    expect(d.url).toBe('/person/7')
  })

  it('falls back to the day itself when 3 days before has passed', () => {
    const d = draftFromEvent(base, new Date(2026, 10, 18, 12))
    expect(d.scheduledAt).toEqual(new Date(2026, 10, 20, 8))
  })

  it('has no suggested time when the event is today after 08:00', () => {
    const d = draftFromEvent(base, new Date(2026, 10, 20, 9))
    expect(d.occursOn).toEqual(new Date(2026, 10, 20))
    expect(d.scheduledAt).toBeNull()
  })

  it('mentions the lunar date for lunar events', () => {
    const d = draftFromEvent({ ...base, dateType: 'LUNAR', day: 15, month: 7, personId: null }, new Date(2026, 0, 1))
    expect(d.content).toContain('15/7 âm lịch')
    expect(d.url).toBe('/anniversaries')
  })
})

describe('eventOccurrence', () => {
  it('returns null for a past one-time event', () => {
    expect(eventOccurrence({ ...base, isRecurring: false, year: 2020 }, new Date(2026, 0, 1))).toBeNull()
  })
})
