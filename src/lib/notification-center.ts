import { and, eq, inArray, lte } from 'drizzle-orm'
import { db } from '~/db/client'
import { notificationDeliveries, notifications, pushSubscriptions, users, type NotificationStats } from '~/db/schema'
import { renderNotificationEmail, sendEmail } from '@/lib/notifications'
import { pushConfigured, sendNotificationToSubscription } from '@/lib/push-notifications'

type Notification = typeof notifications.$inferSelect
type DeliveryRow = typeof notificationDeliveries.$inferInsert

/** Statuses from which a notification may be (re)sent. */
const SENDABLE = ['DRAFT', 'SCHEDULED', 'FAILED']

function describeDevice(userAgent: string | null) {
  if (!userAgent) return 'Thiết bị không rõ'
  const os = /iPhone|iPad/.test(userAgent) ? 'iOS' : /Android/.test(userAgent) ? 'Android' : /Windows/.test(userAgent) ? 'Windows' : /Mac OS/.test(userAgent) ? 'macOS' : /Linux/.test(userAgent) ? 'Linux' : 'Khác'
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /CriOS|Chrome\//.test(userAgent) ? 'Chrome' : /Firefox|FxiOS/.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Trình duyệt'
  return `${browser} · ${os}`
}

/** Users the notification is addressed to (ALL = every ACTIVE member). */
async function resolveRecipients(n: Notification) {
  if (n.audience === 'USERS') {
    const ids = n.recipientUserIds ?? []
    if (ids.length === 0) return []
    return db.query.users.findMany({ where: inArray(users.id, ids) })
  }
  return db.query.users.findMany({ where: eq(users.status, 'ACTIVE') })
}

async function deliver(n: Notification): Promise<NotificationStats> {
  const recipients = await resolveRecipients(n)
  const stats: NotificationStats = {
    recipients: recipients.length,
    email: { sent: 0, failed: 0, skipped: 0 },
    push: { sent: 0, failed: 0 },
  }
  const rows: DeliveryRow[] = []

  if (n.sendEmail) {
    for (const u of recipients) {
      const base = { notificationId: n.id, userId: u.id, channel: 'EMAIL', target: u.email || null }
      const skip = !u.email
        ? 'Chưa có email'
        : u.status !== 'ACTIVE'
          ? 'Tài khoản chưa hoạt động'
          : !u.emailNotifications
            ? 'Đã tắt nhận email'
            : null
      if (skip) {
        rows.push({ ...base, status: 'SKIPPED', error: skip })
        stats.email.skipped++
        continue
      }
      try {
        const ok = await sendEmail(u.email!, n.title, renderNotificationEmail(u.displayName, n.title, n.content), n.content)
        if (ok) {
          rows.push({ ...base, status: 'SENT' })
          stats.email.sent++
        } else {
          rows.push({ ...base, status: 'SKIPPED', error: 'SMTP chưa cấu hình' })
          stats.email.skipped++
        }
      } catch (e: any) {
        rows.push({ ...base, status: 'FAILED', error: String(e?.message || e).slice(0, 500) })
        stats.email.failed++
      }
    }
  }

  if (n.sendPush) {
    if (!pushConfigured) {
      rows.push({ notificationId: n.id, channel: 'PUSH', status: 'SKIPPED', error: 'Chưa cấu hình VAPID' })
    } else {
      const subs =
        n.audience === 'USERS'
          ? (n.recipientUserIds?.length
              ? await db.query.pushSubscriptions.findMany({ where: inArray(pushSubscriptions.userId, n.recipientUserIds) })
              : [])
          : await db.query.pushSubscriptions.findMany()
      const results = await Promise.all(
        subs.map((sub) =>
          sendNotificationToSubscription(sub, { title: n.title, body: n.content, url: n.url || '/', tag: `notification-${n.id}`, id: n.id }),
        ),
      )
      results.forEach((r, i) => {
        const sub = subs[i]
        rows.push({
          notificationId: n.id,
          userId: sub.userId,
          channel: 'PUSH',
          target: describeDevice(sub.userAgent),
          status: r.success ? 'SENT' : 'FAILED',
          error: r.success ? null : String(r.error || '').slice(0, 500),
        })
        if (r.success) stats.push.sent++
        else stats.push.failed++
      })
    }
  }

  if (rows.length) await db.insert(notificationDeliveries).values(rows)
  return stats
}

/**
 * Send one notification now. Claims it atomically (→ SENDING) so a scheduled run
 * and a manual "send now" can never deliver the same notification twice.
 */
export async function dispatchNotification(id: number) {
  const [claimed] = await db
    .update(notifications)
    .set({ status: 'SENDING', updatedAt: new Date() })
    .where(and(eq(notifications.id, id), inArray(notifications.status, SENDABLE)))
    .returning()
  if (!claimed) return null

  try {
    const stats = await deliver(claimed)
    const attempted = stats.email.sent + stats.email.failed + stats.push.sent + stats.push.failed
    const allFailed = attempted > 0 && stats.email.sent + stats.push.sent === 0
    const [done] = await db
      .update(notifications)
      .set({ status: allFailed ? 'FAILED' : 'SENT', sentAt: new Date(), stats, updatedAt: new Date() })
      .where(eq(notifications.id, id))
      .returning()
    return done
  } catch (e) {
    console.error(`[Notifications] Dispatch #${id} failed:`, e)
    await db.update(notifications).set({ status: 'FAILED', updatedAt: new Date() }).where(eq(notifications.id, id))
    throw e
  }
}

/** Send every SCHEDULED notification whose time has come. Called every minute by server.js. */
export async function dispatchDueNotifications(now = new Date()) {
  const due = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.status, 'SCHEDULED'), lte(notifications.scheduledAt, now)))
  let sent = 0
  for (const { id } of due) {
    try {
      if (await dispatchNotification(id)) sent++
    } catch {
      // already logged and marked FAILED
    }
  }
  return { due: due.length, sent }
}

/** Log a system email (e.g. new-account credentials) so it shows up in the notification center. */
export async function recordSystemEmail(opts: {
  kind: string
  title: string
  content: string
  userId: number
  email: string
  createdBy?: number | null
  result: { ok: true } | { ok: false; skipped?: boolean; error: string }
}) {
  const { result } = opts
  const status = result.ok ? 'SENT' : result.skipped ? 'SKIPPED' : 'FAILED'
  const [n] = await db
    .insert(notifications)
    .values({
      kind: opts.kind,
      title: opts.title,
      content: opts.content,
      isActive: false,
      audience: 'USERS',
      recipientUserIds: [opts.userId],
      sendEmail: true,
      status: result.ok || result.skipped ? 'SENT' : 'FAILED',
      sentAt: new Date(),
      createdBy: opts.createdBy ?? null,
      stats: {
        recipients: 1,
        email: { sent: result.ok ? 1 : 0, failed: status === 'FAILED' ? 1 : 0, skipped: status === 'SKIPPED' ? 1 : 0 },
        push: { sent: 0, failed: 0 },
      },
    })
    .returning()
  await db.insert(notificationDeliveries).values({
    notificationId: n.id,
    userId: opts.userId,
    channel: 'EMAIL',
    target: opts.email,
    status,
    error: result.ok ? null : result.error.slice(0, 500),
  })
}
