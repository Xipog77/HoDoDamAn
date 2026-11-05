import { describe, expect, it } from 'vitest'
import { hit, reset, retryAfter } from '@/lib/rate-limit'

describe('rate limit', () => {
  it('blocks after the limit and unblocks when the window ends', () => {
    const key = 'test:block'
    const now = 1_000_000
    for (let i = 0; i < 3; i++) hit(key, 60_000, now)
    expect(retryAfter(key, 3, now)).toBe(60)
    expect(retryAfter(key, 4, now)).toBe(0)
    expect(retryAfter(key, 3, now + 60_000)).toBe(0)
  })

  it('reset clears the counter', () => {
    const key = 'test:reset'
    hit(key, 60_000)
    hit(key, 60_000)
    reset(key)
    expect(retryAfter(key, 1)).toBe(0)
  })
})
