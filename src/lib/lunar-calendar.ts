// Vietnamese Lunar Calendar conversion utilities

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

export function getLunarYear(year: number): string {
  const can = CAN[(year - 4) % 10]
  const chi = CHI[(year - 4) % 12]
  return `${can} ${chi}`
}

// Simple Gregorian to Lunar date approximation
// For production, use a proper Vietnamese lunar calendar library
export function solarToLunar(day: number, month: number, year: number): { day: number; month: number; year: number } {
  // This is a simplified approximation
  // Lunar New Year typically falls between Jan 21 - Feb 20
  const lunarNewYear = getLunarNewYearDate(year)
  const solarDate = new Date(year, month - 1, day)
  const diff = Math.floor((solarDate.getTime() - lunarNewYear.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) {
    const prevLunarNewYear = getLunarNewYearDate(year - 1)
    const prevDiff = Math.floor((solarDate.getTime() - prevLunarNewYear.getTime()) / (1000 * 60 * 60 * 24))
    return approximateLunarDate(prevDiff)
  }
  return approximateLunarDate(diff)
}

function getLunarNewYearDate(year: number): Date {
  // Approximate Lunar New Year dates (Tết)
  const tetDates: Record<number, [number, number]> = {
    2020: [1, 25], 2021: [2, 12], 2022: [2, 1], 2023: [1, 22], 2024: [2, 10],
    2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13],
  }
  const [month, day] = tetDates[year] || [2, 1]
  return new Date(year, month - 1, day)
}

function approximateLunarDate(daysSinceNewYear: number): { day: number; month: number; year: number } {
  const lunarMonth = Math.floor(daysSinceNewYear / 29.5)
  const lunarDay = Math.round(daysSinceNewYear % 29.5) + 1
  return {
    day: Math.min(lunarDay, 30),
    month: lunarMonth + 1,
    year: 0,
  }
}

export function formatLunarDate(day: number, month: number): string {
  return `Ngày ${day} tháng ${month} âm lịch`
}

export function getUpcomingDeathAnniversaries(
  persons: Array<{ id: number; name: string; dod: string | null; dodLunar: string | null }>
): Array<{ personId: number; name: string; lunarDate: string; daysUntil: number }> {
  const today = new Date()
  const currentYear = today.getFullYear()
  const results: Array<{ personId: number; name: string; lunarDate: string; daysUntil: number }> = []

  for (const person of persons) {
    if (!person.dod && !person.dodLunar) continue

    // Parse date of death
    const dodStr = person.dod || ''
    const parts = dodStr.split('-')
    if (parts.length < 2) continue

    const dodMonth = parseInt(parts[1])
    const dodDay = parseInt(parts[2] || '1')

    // Calculate next anniversary
    let nextDate = new Date(currentYear, dodMonth - 1, dodDay)
    if (nextDate < today) {
      nextDate = new Date(currentYear + 1, dodMonth - 1, dodDay)
    }

    const daysUntil = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil <= 30) {
      results.push({
        personId: person.id,
        name: person.name,
        lunarDate: person.dodLunar || formatLunarDate(dodDay, dodMonth),
        daysUntil,
      })
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function lunarToSolar(lunarDay: number, lunarMonth: number, year: number): Date | null {
  const start = new Date(year, 0, 1)
  for (let i = 0; i < 366; i++) {
    const checkDate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
    if (checkDate.getFullYear() !== year) break
    const lunar = solarToLunar(checkDate.getDate(), checkDate.getMonth() + 1, checkDate.getFullYear())
    if (lunar.day === lunarDay && lunar.month === lunarMonth) {
      return checkDate
    }
  }
  return null
}
