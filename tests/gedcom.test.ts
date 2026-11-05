import { describe, expect, it } from 'vitest'
import { buildGedcom, gedcomDate, type GedcomPerson } from '@/lib/gedcom'

const person = (p: Partial<GedcomPerson> & { id: number; name: string }): GedcomPerson => ({
  gender: 'MALE', birthYear: null, deathYear: null, dob: null, dod: null, dobLunar: null, dodLunar: null,
  fatherId: null, motherId: null, birthplace: null, burialPlace: null, isDeceased: false, generation: 1, branch: null,
  ...p,
})

describe('gedcomDate', () => {
  it.each([
    ['1954-08-15', null, '15 AUG 1954'],
    ['15/08/1954', null, '15 AUG 1954'],
    ['1954', null, '1954'],
    [null, 1920, '1920'],
    ['không rõ', null, null],
  ])('%s', (raw, year, expected) => {
    expect(gedcomDate(raw, year)).toBe(expected)
  })
})

describe('buildGedcom', () => {
  const out = buildGedcom(
    [
      person({ id: 1, name: 'Đỗ Văn A', isDeceased: true, dodLunar: '12/3' }),
      person({ id: 2, name: 'Nguyễn Thị B', gender: 'FEMALE' }),
      person({ id: 3, name: 'Đỗ Văn C', fatherId: 1, motherId: 2, generation: 2 }),
      person({ id: 4, name: 'Đỗ Văn D', fatherId: 1, generation: 2 }),
    ],
    [{ husbandId: 1, wifeId: 2, weddingYear: 1950 }],
    new Date(2026, 10, 5),
  )

  it('has a valid header and trailer', () => {
    expect(out.startsWith('0 HEAD\r\n')).toBe(true)
    expect(out).toContain('1 CHAR UTF-8')
    expect(out.endsWith('0 TRLR\r\n')).toBe(true)
  })

  it('marks the Vietnamese family name as surname', () => {
    expect(out).toContain('1 NAME /Đỗ/ Văn A')
  })

  it('links spouses and children through families', () => {
    expect(out).toMatch(/0 @F1@ FAM\r\n1 HUSB @I1@\r\n1 WIFE @I2@\r\n1 MARR\r\n2 DATE 1950\r\n1 CHIL @I3@/)
    // child with only a known father gets a separate single-parent family
    expect(out).toMatch(/0 @F2@ FAM\r\n1 HUSB @I1@\r\n1 CHIL @I4@/)
  })

  it('records death and the lunar anniversary', () => {
    expect(out).toContain('1 DEAT Y\r\n2 NOTE Ngày mất âm lịch: 12/3')
  })
})
