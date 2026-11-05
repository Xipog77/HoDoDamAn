// In-memory limiter: fine for the single web container this app runs in.
// Counts are lost on restart, which is acceptable for brute-force protection.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

/** Seconds until `key` may try again, or 0 if it is under `limit` hits in the current window. */
export function retryAfter(key: string, limit: number, now = Date.now()): number {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) return 0
  return bucket.count >= limit ? Math.ceil((bucket.resetAt - now) / 1000) : 0
}

export function hit(key: string, windowMs: number, now = Date.now()): void {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) prune(now)
  } else {
    bucket.count++
  }
}

export function reset(key: string): void {
  buckets.delete(key)
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function tooManyRequests(seconds: number): Response {
  return Response.json(
    { error: `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(seconds / 60)} phút.` },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  )
}
