import { createFileRoute } from '@tanstack/react-router'
import bcrypt from 'bcryptjs'
import { db } from '~/db/client'
import { users } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { signToken, setAuthCookie } from '@/lib/auth'
import { clientIp, hit, reset, retryAfter, tooManyRequests } from '@/lib/rate-limit'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES_PER_ACCOUNT = 10
const MAX_FAILURES_PER_IP = 30

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { username, password } = body

      if (!username || !password) {
        return Response.json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' }, { status: 400 })
      }

      const accountKey = `login:${clientIp(request)}:${String(username).toLowerCase()}`
      const ipKey = `login-ip:${clientIp(request)}`
      const wait = Math.max(
        retryAfter(accountKey, MAX_FAILURES_PER_ACCOUNT),
        retryAfter(ipKey, MAX_FAILURES_PER_IP),
      )
      if (wait > 0) return tooManyRequests(wait)
      const fail = (response: Response) => {
        hit(accountKey, WINDOW_MS)
        hit(ipKey, WINDOW_MS)
        return response
      }

      const user = await db.query.users.findFirst({ where: eq(users.username, username) })
      if (!user) {
        return fail(Response.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 }))
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return fail(Response.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 }))
      }

      if (user.status === 'PENDING') {
        return Response.json({ error: 'Tài khoản của bạn đang chờ Admin duyệt' }, { status: 403 })
      }

      if (user.status === 'SUSPENDED') {
        return Response.json({ error: 'Tài khoản của bạn đã bị khóa' }, { status: 403 })
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        const { code } = body
        if (!code) {
          // Tell client that 2FA code is required
          return Response.json({ requires2FA: true })
        }

        // Verify the code
        const { verifyTOTP } = await import('@/lib/totp')
        const isValidOTP = verifyTOTP(code, user.twoFactorSecret || '')
        if (!isValidOTP) {
          return fail(Response.json({ error: 'Mã xác thực 2FA không chính xác' }, { status: 401 }))
        }
      }

      reset(accountKey)

      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      })

      return new Response(
        JSON.stringify({
          message: 'Đăng nhập thành công',
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            personId: user.personId,
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': setAuthCookie(token),
          },
        }
      )
    } catch (e) {
      console.error(e)
      return Response.json({ error: 'Đã xảy ra lỗi. Vui lòng thử lại.' }, { status: 500 })
    }
  },
    }
  }
})
