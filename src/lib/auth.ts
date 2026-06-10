import { SignJWT, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gia-pha-viet-nam-secret-key-change-in-production'
)

export interface TokenPayload extends JWTPayload {
  userId: number
  username: string
  role: string
  status: string
}

export async function signToken(payload: Omit<TokenPayload, keyof JWTPayload>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as TokenPayload
  } catch {
    return null
  }
}

export function setAuthCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60
  const useSecure = process.env.SECURE_COOKIE === 'true'
  return `auth_token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${useSecure ? '; Secure' : ''}`
}

export function clearAuthCookie(): string {
  return 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/auth_token=([^;]+)/)
  return match ? match[1] : null
}
