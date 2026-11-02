import webpush from 'web-push'
import { db } from '~/db/client'
import { pushSubscriptions } from '~/db/schema'
import { eq } from 'drizzle-orm'

export const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BPqOsqvR2Irtgs4k5bs38UoXBZ4CYdNM9z53Ig-kGq4F8pWz0v2xi156mM1XtXNNPnI0QMUF4iZl9xc8c9yvI8A'

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'Xe2Z-5Py-WI_0vzdIi_j6R6Lq64n3Y67gZYbaeEAWMM'

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@dodaman.id.vn'

// Configure web-push with VAPID details
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
  id?: string | number
}

export interface ClientSubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Save or update a device PushSubscription
 */
export async function savePushSubscription({
  userId,
  subscription,
  userAgent,
}: {
  userId?: number | null
  subscription: ClientSubscriptionInput
  userAgent?: string
}) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Dữ liệu PushSubscription không hợp lệ')
  }

  const { endpoint, keys } = subscription
  const { p256dh, auth } = keys

  const existing = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.endpoint, endpoint),
  })

  if (existing) {
    const [updated] = await db
      .update(pushSubscriptions)
      .set({
        userId: userId ?? existing.userId,
        p256dh,
        auth,
        userAgent: userAgent || existing.userAgent,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing.id))
      .returning()
    return updated
  } else {
    const [inserted] = await db
      .insert(pushSubscriptions)
      .values({
        userId: userId || null,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
      })
      .returning()
    return inserted
  }
}

/**
 * Remove a device PushSubscription by endpoint
 */
export async function removePushSubscription(endpoint: string) {
  if (!endpoint) return
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
}

/**
 * Send a notification to a single subscription
 * Automatically prunes expired/unregistered endpoints (404/410)
 */
export async function sendNotificationToSubscription(
  sub: {
    id: number
    endpoint: string
    p256dh: string
    auth: string
  },
  payload: PushPayload
) {
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  }

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag || `dodo-tag-${Date.now()}`,
    id: payload.id || Date.now(),
  })

  try {
    await webpush.sendNotification(pushSubscription, payloadString)
    return { success: true, id: sub.id }
  } catch (err: any) {
    // 404 Not Found or 410 Gone means the subscription is no longer valid or unsubscribed
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`[Push] Endpoint expired (${err.statusCode}), deleting:`, sub.endpoint)
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, sub.id))
    } else {
      console.error(`[Push] Failed to send push to ID ${sub.id}:`, err.message || err)
    }
    return { success: false, id: sub.id, error: err.message }
  }
}

/**
 * Broadcast notification to all active devices (or filtered by user)
 */
export async function broadcastPushNotification(
  payload: PushPayload,
  options?: { targetUserId?: number }
) {
  let query = db.query.pushSubscriptions.findMany()
  if (options?.targetUserId) {
    query = db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, options.targetUserId),
    })
  }

  const allSubs = await query
  if (!allSubs || allSubs.length === 0) {
    return { totalSent: 0, successCount: 0, failureCount: 0 }
  }

  const results = await Promise.allSettled(
    allSubs.map((sub) => sendNotificationToSubscription(sub, payload))
  )

  let successCount = 0
  let failureCount = 0

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) {
      successCount++
    } else {
      failureCount++
    }
  }

  return {
    totalSent: allSubs.length,
    successCount,
    failureCount,
  }
}
