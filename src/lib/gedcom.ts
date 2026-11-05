// GEDCOM 5.5.1 export so the tree can be opened in Gramps, MyHeritage, FamilySearch, etc.
// Only genealogy facts are exported; contact details stay in the app.

export interface GedcomPerson {
  id: number
  name: string
  gender: string
  birthYear: number | null
  deathYear: number | null
  dob: string | null
  dod: string | null
  dobLunar: string | null
  dodLunar: string | null
  fatherId: number | null
  motherId: number | null
  birthplace: string | null
  burialPlace: string | null
  isDeceased: boolean | null
  generation: number
  branch: string | null
}

export interface GedcomMarriage {
  husbandId: number
  wifeId: number
  weddingYear?: number | null
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** "1954-08-15" or "15/08/1954" → "15 AUG 1954"; falls back to the bare year. */
export function gedcomDate(raw: string | null, year: number | null): string | null {
  const s = raw?.trim() ?? ''
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${+m[1]} ${MONTHS[+m[2] - 1]} ${m[3]}`
  m = s.match(/^(\d{4})$/)
  if (m) return m[1]
  return year ? String(year) : null
}

/** Vietnamese names are written family-name first; GEDCOM marks the surname with slashes. */
function gedcomName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name.trim()
  return `/${parts[0]}/ ${parts.slice(1).join(' ')}`
}

function clean(text: string) {
  return text.replace(/[\r\n]+/g, ' ').trim()
}

export function buildGedcom(persons: GedcomPerson[], marriages: GedcomMarriage[], now = new Date()): string {
  const ids = new Set(persons.map((p) => p.id))
  const families = new Map<string, { husband: number | null; wife: number | null; children: number[]; year?: number | null }>()
  const family = (husband: number | null, wife: number | null) => {
    const h = husband && ids.has(husband) ? husband : null
    const w = wife && ids.has(wife) ? wife : null
    const key = `${h ?? 0}-${w ?? 0}`
    if (!families.has(key)) families.set(key, { husband: h, wife: w, children: [] })
    return families.get(key)!
  }

  for (const m of marriages) family(m.husbandId, m.wifeId).year = m.weddingYear
  for (const p of persons) {
    if (p.fatherId || p.motherId) {
      const f = family(p.fatherId, p.motherId)
      if (f.husband || f.wife) f.children.push(p.id)
    }
  }

  const famIds = new Map<string, number>()
  let n = 0
  for (const [key, f] of families) if (f.husband || f.wife) famIds.set(key, ++n)

  const lines: string[] = [
    '0 HEAD',
    '1 SOUR GIAPHA_DAM_AN',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    `1 DATE ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  ]

  for (const p of persons) {
    lines.push(`0 @I${p.id}@ INDI`, `1 NAME ${gedcomName(clean(p.name))}`, `1 SEX ${p.gender === 'FEMALE' ? 'F' : 'M'}`)

    const birth = gedcomDate(p.dob, p.birthYear)
    if (birth || p.birthplace) {
      lines.push('1 BIRT')
      if (birth) lines.push(`2 DATE ${birth}`)
      if (p.birthplace) lines.push(`2 PLAC ${clean(p.birthplace)}`)
    }

    const death = gedcomDate(p.dod, p.deathYear)
    if (death || p.isDeceased || p.dodLunar) {
      lines.push(death ? '1 DEAT' : '1 DEAT Y')
      if (death) lines.push(`2 DATE ${death}`)
      if (p.dodLunar) lines.push(`2 NOTE Ngày mất âm lịch: ${clean(p.dodLunar)}`)
    }
    if (p.burialPlace) lines.push('1 BURI', `2 PLAC ${clean(p.burialPlace)}`)
    if (p.dobLunar) lines.push(`1 NOTE Ngày sinh âm lịch: ${clean(p.dobLunar)}`)
    lines.push(`1 NOTE Đời thứ ${p.generation}${p.branch ? `, chi ${clean(p.branch)}` : ''}`)

    for (const [key, f] of families) {
      const fam = famIds.get(key)
      if (!fam) continue
      if (f.husband === p.id || f.wife === p.id) lines.push(`1 FAMS @F${fam}@`)
      if (f.children.includes(p.id)) lines.push(`1 FAMC @F${fam}@`)
    }
  }

  for (const [key, f] of families) {
    const fam = famIds.get(key)
    if (!fam) continue
    lines.push(`0 @F${fam}@ FAM`)
    if (f.husband) lines.push(`1 HUSB @I${f.husband}@`)
    if (f.wife) lines.push(`1 WIFE @I${f.wife}@`)
    if (f.year) lines.push('1 MARR', `2 DATE ${f.year}`)
    for (const c of f.children) lines.push(`1 CHIL @I${c}@`)
  }

  lines.push('0 TRLR')
  return lines.join('\r\n') + '\r\n'
}
