// Vietnamese Astronomical Lunar Calendar utilities
// Based on the astronomical algorithm for Vietnam timezone (GMT+7) by Dr. Ho Ngoc Duc

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']

const PI = Math.PI

function INT(d: number): number {
  return Math.floor(d)
}

/**
 * Convert solar Gregorian date to Julian Day Number
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12)
  const y = yy + 4800 - a
  const m = mm + 12 * a - 3
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083
  }
  return jd
}

/**
 * Convert Julian Day Number to solar Gregorian date [day, month, year]
 */
export function jdToDate(jd: number): [number, number, number] {
  let a: number
  if (jd > 2299160) {
    const a1 = INT((jd - 1867216.25) / 36524.25)
    a = jd + 1 + a1 - INT(a1 / 4)
  } else {
    a = jd
  }
  const b = a + 1524
  const c = INT((b - 122.1) / 365.25)
  const d = INT(365.25 * c)
  const e = INT((b - d) / 30.6001)
  const day = b - d - INT(30.6001 * e)
  const month = e < 14 ? e - 1 : e - 13
  const year = month > 2 ? c - 4716 : c - 4715
  return [day, month, year]
}

function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85
  const T2 = T * T
  const T3 = T2 * T
  const dr = PI / 180
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr)
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M)
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr)
  C1 -= 0.0004 * Math.sin(3 * dr * Mpr)
  C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr)
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr)
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr)
  C1 += 0.001 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr)
  return INT(Jd1 + C1 + 0.5 + timeZone / 24)
}

function getSunLongitude(dayNumber: number, timeZone = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525
  const T2 = T * T
  const dr = PI / 180
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M)
  let L = (L0 + DL) * dr
  L -= PI * 2 * INT(L / (PI * 2))
  return INT(L / (PI / 6))
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021
  const k = INT(off / 29.530588853)
  let nm = getNewMoonDay(k, timeZone)
  const sunLong = getSunLongitude(nm, timeZone)
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone)
  }
  return nm
}

function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5)
  let last = 0
  let i = 1
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  do {
    last = arc
    i++
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone)
  } while (arc !== last && i < 14)
  return i - 1
}

/**
 * Convert Solar (Gregorian) date to Vietnamese Lunar date accurately
 */
export function solarToLunar(day: number, month: number, year: number, timeZone = 7): {
  day: number
  month: number
  year: number
  leap: boolean
} {
  const dayNumber = jdFromDate(day, month, year)
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853)
  let monthStart = getNewMoonDay(k + 1, timeZone)
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone)
  }
  let a11 = getLunarMonth11(year, timeZone)
  let b11 = a11
  let lunarYear: number
  if (a11 >= monthStart) {
    lunarYear = year
    a11 = getLunarMonth11(year - 1, timeZone)
  } else {
    lunarYear = year + 1
    b11 = getLunarMonth11(year + 1, timeZone)
  }
  const lunarDay = dayNumber - monthStart + 1
  const diff = INT((monthStart - a11) / 29)
  let lunarLeap = false
  let lunarMonth = diff + 11
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone)
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10
      if (diff === leapMonthDiff) {
        lunarLeap = true
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1
  }
  return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap }
}

/**
 * Convert Vietnamese Lunar date to Solar (Gregorian) date accurately
 */
export function lunarToSolar(lunarDay: number, lunarMonth: number, year: number, isLeap = 0): Date | null {
  const startJd = jdFromDate(15, 1, year)
  for (let i = 0; i < 400; i++) {
    const [d, m, y] = jdToDate(startJd + i)
    const l = solarToLunar(d, m, y)
    if (l.year === year && l.month === lunarMonth && l.day === lunarDay && (isLeap === 0 || (isLeap === 1 && l.leap))) {
      return new Date(y, m - 1, d)
    }
  }
  return null
}

/**
 * Return Can Chi string for a year (e.g. 2024 -> 'Giáp Thìn', 2025 -> 'Ất Tỵ', 2026 -> 'Bính Ngọ')
 */
export function getLunarYear(year: number): string {
  const can = CAN[(year + 6) % 10]
  const chi = CHI[(year + 8) % 12]
  return `${can} ${chi}`
}

/**
 * Return Can Chi string for a solar day
 */
export function getDayCanChi(day: number, month: number, year: number): string {
  const jd = jdFromDate(day, month, year)
  const can = CAN[(jd + 9) % 10]
  const chi = CHI[(jd + 1) % 12]
  return `${can} ${chi}`
}

export function formatLunarDate(day: number, month: number): string {
  return `Ngày ${day} tháng ${month} âm lịch`
}

/**
 * Parse a flexible Vietnamese lunar date string
 * Examples: "29 tháng Giêng", "23/11/1997", "27/12", "19/04/2026", "1/4", "9/2/1966"
 */
export function parseLunarDate(str: string | null | undefined): { day: number; month: number } | null {
  if (!str) return null
  const s = str.trim().toLowerCase()
  if (s.includes('tháng giêng') || s.match(/tháng\s+1\b/)) {
    const match = s.match(/(?:ngày\s+)?(\d+)/)
    if (match) return { day: parseInt(match[1], 10), month: 1 }
  }
  const slashParts = s.split('/')
  if (slashParts.length >= 2) {
    const d = parseInt(slashParts[0], 10)
    const m = parseInt(slashParts[1], 10)
    if (!isNaN(d) && !isNaN(m) && d >= 1 && d <= 30 && m >= 1 && m <= 12) {
      return { day: d, month: m }
    }
  }
  const matchAny = s.match(/(?:ngày\s+)?(\d+)\s+tháng\s+(\d+)/i)
  if (matchAny) {
    return { day: parseInt(matchAny[1], 10), month: parseInt(matchAny[2], 10) }
  }
  return null
}

/**
 * Calculate upcoming death anniversaries (within 45 days) for ancestors
 */
export function getUpcomingDeathAnniversaries(
  persons: Array<{ id: number; name: string; dod: string | null; dodLunar: string | null }>
): Array<{ personId: number; name: string; lunarDate: string; daysUntil: number; solarDateStr?: string }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentYear = today.getFullYear()
  const results: Array<{ personId: number; name: string; lunarDate: string; daysUntil: number; solarDateStr?: string }> = []

  for (const person of persons) {
    if (!person.dod && !person.dodLunar) continue

    let targetSolarDate: Date | null = null
    let displayLunarStr = ''

    // 1. Try parsing dodLunar first
    const lunarParsed = parseLunarDate(person.dodLunar)
    if (lunarParsed) {
      displayLunarStr = person.dodLunar || formatLunarDate(lunarParsed.day, lunarParsed.month)
      // Check for current year
      let sol = lunarToSolar(lunarParsed.day, lunarParsed.month, currentYear)
      if (sol) {
        sol.setHours(0, 0, 0, 0)
        if (sol.getTime() < today.getTime()) {
          // Has passed this year, get next year's date
          sol = lunarToSolar(lunarParsed.day, lunarParsed.month, currentYear + 1)
        }
        targetSolarDate = sol
      }
    } else if (person.dod) {
      // 2. Parse solar date of death
      const dodStr = person.dod.trim()
      let d = 1
      let m = 1
      if (dodStr.includes('-')) {
        const parts = dodStr.split('-')
        if (parts.length >= 2) {
          m = parseInt(parts[1], 10)
          d = parseInt(parts[2] || '1', 10)
        }
      } else if (dodStr.includes('/')) {
        const parts = dodStr.split('/')
        if (parts.length >= 2) {
          d = parseInt(parts[0], 10)
          m = parseInt(parts[1], 10)
        }
      }

      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        let sol = new Date(currentYear, m - 1, d)
        sol.setHours(0, 0, 0, 0)
        if (sol.getTime() < today.getTime()) {
          sol = new Date(currentYear + 1, m - 1, d)
        }
        targetSolarDate = sol
        const lunarEquivalent = solarToLunar(d, m, currentYear)
        displayLunarStr = formatLunarDate(lunarEquivalent.day, lunarEquivalent.month)
      }
    }

    if (targetSolarDate) {
      const diffMs = targetSolarDate.getTime() - today.getTime()
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (daysUntil >= 0 && daysUntil <= 45) {
        results.push({
          personId: person.id,
          name: person.name,
          lunarDate: displayLunarStr,
          daysUntil,
          solarDateStr: `${targetSolarDate.getDate()}/${targetSolarDate.getMonth() + 1}/${targetSolarDate.getFullYear()}`,
        })
      }
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil)
}
