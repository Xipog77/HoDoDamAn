import { describe, expect, it } from 'vitest'
import { nextOccurrence } from '@/lib/lunar-calendar'
import { findDueReminders, todayInVietnam } from '@/lib/anniversary-reminders'

const base = { type: 'DEATH', isRecurring: true, year: null, personId: null }

describe('nextOccurrence', () => {
  it('returns this year’s solar date, or next year once it has passed', () => {
    expect(nextOccurrence('SOLAR', 2, 9, new Date(2026, 8, 1))).toEqual(new Date(2026, 8, 2))
    expect(nextOccurrence('SOLAR', 2, 9, new Date(2026, 8, 3))).toEqual(new Date(2027, 8, 2))
  })

  it('finds lunar month 12 of the previous lunar year in January', () => {
    // 20/12 Ất Tỵ (2025) falls on 7/2/2026 (sóc tháng Chạp 02:52 ngày 19/1 giờ VN)
    expect(nextOccurrence('LUNAR', 20, 12, new Date(2026, 0, 10))).toEqual(new Date(2026, 1, 7))
  })

  it('falls back to day 29 when the lunar month has no 30th', () => {
    // Tháng 2 âm năm 2026 chỉ có 29 ngày
    const date = nextOccurrence('LUNAR', 30, 2, new Date(2026, 2, 1))
    expect(date).not.toBeNull()
  })
})

describe('findDueReminders', () => {
  const list = [
    { ...base, id: 1, title: 'Giỗ cụ A', dateType: 'SOLAR', day: 8, month: 11 },
    { ...base, id: 2, title: 'Giỗ cụ B', dateType: 'SOLAR', day: 5, month: 11 },
    { ...base, id: 3, title: 'Giỗ cụ C', dateType: 'SOLAR', day: 6, month: 11 },
    { ...base, id: 4, title: 'Họp họ 2025', dateType: 'SOLAR', day: 8, month: 11, isRecurring: false, year: 2025 },
  ]

  it('picks events 3 days ahead and today only', () => {
    const due = findDueReminders(list, new Date(2026, 10, 5))
    expect(due.map((d) => [d.anniversary.id, d.daysBefore])).toEqual([[1, 3], [2, 0]])
  })
})

describe('todayInVietnam', () => {
  it('rolls over at midnight UTC+7, not UTC', () => {
    expect(todayInVietnam(new Date('2026-11-04T16:59:00Z'))).toEqual(new Date(2026, 10, 4))
    expect(todayInVietnam(new Date('2026-11-04T17:00:00Z'))).toEqual(new Date(2026, 10, 5))
  })
})
