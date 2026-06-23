import { createFileRoute } from '@tanstack/react-router'
import bcrypt from 'bcryptjs'
import { db } from '~/db/client'
import { users, persons } from '~/db/schema'
import { eq } from 'drizzle-orm'
import { getTokenFromCookies, verifyToken } from '@/lib/auth'
import { generateSecret, verifyTOTP } from '@/lib/totp'

export const Route = createFileRoute('/api/auth/settings')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload) {
          return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 })
        }

        try {
          const user = await db.query.users.findFirst({
            where: eq(users.id, payload.userId)
          })

          if (!user) {
            return Response.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
          }

          let contactVisibility = { phone: false, email: false, social: false }
          if (user.personId) {
            const p = await db.query.persons.findFirst({
              where: eq(persons.id, user.personId)
            })
            if (p && p.contactVisibility) {
              contactVisibility = { ...contactVisibility, ...(p.contactVisibility as any) }
            }
          }

          return Response.json({
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              email: user.email,
              phone: user.phone,
              twoFactorEnabled: user.twoFactorEnabled,
              emailNotifications: user.emailNotifications,
              personId: user.personId,
              socialLinks: user.socialLinks,
              occupation: user.occupation,
              currentAddress: user.currentAddress,
              contactVisibility,
            }
          })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      },

      POST: async ({ request }) => {
        const token = getTokenFromCookies(request.headers.get('cookie'))
        const payload = token ? await verifyToken(token) : null
        if (!payload) {
          return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 })
        }

        try {
          const body = await request.json()
          const user = await db.query.users.findFirst({
            where: eq(users.id, payload.userId)
          })

          if (!user) {
            return Response.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
          }

          // Case 1: setup 2FA
          if (body.action === 'setup2FA') {
            const secret = generateSecret()
            const otpauthUrl = `otpauth://totp/HoDoDamAn:${user.username}?secret=${secret}&issuer=HoDoDamAn`
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
            return Response.json({ secret, qrCodeUrl })
          }

          // Case 2: verify and enable 2FA
          if (body.action === 'verify2FA') {
            const { secret, code } = body
            if (!secret || !code) {
              return Response.json({ error: 'Thiếu mã xác thực hoặc mã bí mật' }, { status: 400 })
            }

            const isValid = verifyTOTP(code, secret)
            if (!isValid) {
              return Response.json({ error: 'Mã xác thực không chính xác' }, { status: 400 })
            }

            await db.update(users)
              .set({
                twoFactorEnabled: true,
                twoFactorSecret: secret,
                updatedAt: new Date()
              })
              .where(eq(users.id, user.id))

            return Response.json({ success: true, message: 'Đã kích hoạt 2FA thành công' })
          }

          // Case 3: disable 2FA
          if (body.action === 'disable2FA') {
            const { code } = body
            if (!code) {
              return Response.json({ error: 'Vui lòng nhập mã xác thực để tắt 2FA' }, { status: 400 })
            }

            if (!user.twoFactorSecret) {
              return Response.json({ error: '2FA chưa được thiết lập' }, { status: 400 })
            }

            const isValid = verifyTOTP(code, user.twoFactorSecret)
            if (!isValid) {
              return Response.json({ error: 'Mã xác thực không chính xác' }, { status: 400 })
            }

            await db.update(users)
              .set({
                twoFactorEnabled: false,
                twoFactorSecret: null,
                updatedAt: new Date()
              })
              .where(eq(users.id, user.id))

            return Response.json({ success: true, message: 'Đã tắt 2FA thành công' })
          }

          // Case 4: change password
          if (body.action === 'changePassword') {
            const { oldPassword, newPassword } = body
            if (!oldPassword || !newPassword) {
              return Response.json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' }, { status: 400 })
            }

            const isValid = await bcrypt.compare(oldPassword, user.passwordHash)
            if (!isValid) {
              return Response.json({ error: 'Mật khẩu cũ không chính xác' }, { status: 400 })
            }

            const newHash = await bcrypt.hash(newPassword, 10)
            await db.update(users)
              .set({
                passwordHash: newHash,
                updatedAt: new Date()
              })
              .where(eq(users.id, user.id))

            return Response.json({ success: true, message: 'Đổi mật khẩu thành công' })
          }

          // Case 5: normal profile update
          const updateData: any = {
            displayName: body.displayName || user.displayName,
            email: body.email || null,
            phone: body.phone || null,
            emailNotifications: body.emailNotifications !== undefined ? body.emailNotifications : user.emailNotifications,
            updatedAt: new Date()
          }

          if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks
          if (body.occupation !== undefined) updateData.occupation = body.occupation || null
          if (body.currentAddress !== undefined) updateData.currentAddress = body.currentAddress || null

          await db.update(users)
            .set(updateData)
            .where(eq(users.id, user.id))

          // If user is linked to a person profile, sync contact info to that person
          if (user.personId) {
            const { persons } = await import('~/db/schema')
            const personUpdate: any = { updatedAt: new Date() }
            if (body.phone !== undefined) personUpdate.phone = body.phone || null
            if (body.email !== undefined) personUpdate.email = body.email || null
            if (body.socialLinks !== undefined) personUpdate.socialLinks = body.socialLinks
            if (body.occupation !== undefined) personUpdate.occupation = body.occupation || null
            if (body.currentAddress !== undefined) personUpdate.currentAddress = body.currentAddress || null
            if (body.contactVisibility !== undefined) personUpdate.contactVisibility = body.contactVisibility

            await db.update(persons)
              .set(personUpdate)
              .where(eq(persons.id, user.personId))
          }

          return Response.json({ success: true, message: 'Cập nhật thông tin thành công' })
        } catch (e) {
          console.error(e)
          return Response.json({ error: 'Lỗi server' }, { status: 500 })
        }
      }
    }
  }
})
