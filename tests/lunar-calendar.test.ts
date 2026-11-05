import { describe, expect, it } from 'vitest'
import { getLunarYear, lunarToSolar, parseLunarDate, solarToLunar } from '@/lib/lunar-calendar'

describe('solarToLunar', () => {
  it.each([
    [10, 2, 2024, { day: 1, month: 1, year: 2024, leap: false }], // Tết Giáp Thìn
    [29, 1, 2025, { day: 1, month: 1, year: 2025, leap: false }], // Tết Ất Tỵ
    [17, 2, 2026, { day: 1, month: 1, year: 2026, leap: false }], // Tết Bính Ngọ
    [28, 1, 2025, { day: 29, month: 12, year: 2024, leap: false }], // Giao thừa
    [22, 3, 2023, { day: 1, month: 2, year: 2023, leap: true }], // tháng 2 nhuận 2023
    [25, 7, 2025, { day: 1, month: 6, year: 2025, leap: true }], // tháng 6 nhuận 2025
  ])('%i/%i/%i', (d, m, y, expected) => {
    expect(solarToLunar(d, m, y)).toEqual(expected)
  })
})

describe('Tết Nguyên Đán', () => {
  it.each([
    [1985, 1, 21], // Việt Nam đón Tết sớm hơn Trung Quốc một tháng
    [2000, 2, 5], [2010, 2, 14], [2015, 2, 19], [2020, 1, 25], [2021, 2, 12],
    [2022, 2, 1], [2023, 1, 22], [2027, 2, 6], [2028, 1, 26], [2029, 2, 13],
    [2030, 2, 2], // sóc 23:07 giờ VN ngày 2/2 — Trung Quốc (UTC+8) đón Tết 3/2
  ])('%i: %i/%i', (year, month, day) => {
    expect(lunarToSolar(1, 1, year)).toEqual(new Date(year, month - 1, day))
  })
})

describe('lunarToSolar', () => {
  it('finds Tết and year-end dates in the following solar year', () => {
    expect(lunarToSolar(1, 1, 2026)).toEqual(new Date(2026, 1, 17))
    expect(lunarToSolar(29, 12, 2024)).toEqual(new Date(2025, 0, 28))
  })

  it('picks the regular month, not the leap month, by default', () => {
    expect(lunarToSolar(1, 6, 2025)).toEqual(new Date(2025, 5, 25))
  })

  it('round-trips every day of a year', () => {
    for (let i = 0; i < 365; i++) {
      const date = new Date(2027, 0, 1 + i)
      const l = solarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear())
      if (l.leap) continue
      expect(lunarToSolar(l.day, l.month, l.year)).toEqual(date)
    }
  })
})

describe('getLunarYear', () => {
  it.each([
    [2024, 'Giáp Thìn'],
    [2025, 'Ất Tỵ'],
    [2026, 'Bính Ngọ'],
  ])('%i → %s', (year, name) => {
    expect(getLunarYear(year)).toBe(name)
  })
})

describe('parseLunarDate', () => {
  it.each([
    ['29 tháng Giêng', { day: 29, month: 1 }],
    ['23/11/1997', { day: 23, month: 11 }],
    ['27/12', { day: 27, month: 12 }],
    ['ngày 7 tháng 3', { day: 7, month: 3 }],
  ])('%s', (input, expected) => {
    expect(parseLunarDate(input)).toEqual(expected)
  })

  it('rejects empty or invalid input', () => {
    expect(parseLunarDate('')).toBeNull()
    expect(parseLunarDate(null)).toBeNull()
    expect(parseLunarDate('không rõ')).toBeNull()
  })
})
