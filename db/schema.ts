import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['GUEST', 'MEMBER', 'ADMIN', 'SUPER_ADMIN'])
export const userStatusEnum = pgEnum('user_status', ['PENDING', 'ACTIVE', 'SUSPENDED'])
export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE'])
export const fundTypeEnum = pgEnum('fund_type', ['IN', 'OUT'])
export const editRequestStatusEnum = pgEnum('edit_request_status', ['PENDING', 'APPROVED', 'REJECTED'])
export const mediaSourceEnum = pgEnum('media_source', ['UPLOAD', 'EXTERNAL'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('MEMBER'),
  status: userStatusEnum('status').notNull().default('PENDING'),
  personId: integer('person_id'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorSecret: text('two_factor_secret'),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  socialLinks: jsonb('social_links'), // { facebook?, zalo?, tiktok?, youtube? }
  occupation: varchar('occupation', { length: 300 }),
  currentAddress: varchar('current_address', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  gender: genderEnum('gender').notNull().default('MALE'),
  birthYear: integer('birth_year'),
  deathYear: integer('death_year'),
  dob: varchar('dob', { length: 20 }),
  dod: varchar('dod', { length: 20 }),
  dobLunar: varchar('dob_lunar', { length: 20 }),
  dodLunar: varchar('dod_lunar', { length: 20 }),
  fatherId: integer('father_id'),
  motherId: integer('mother_id'),
  biography: text('biography'),
  fullBiography: text('full_biography'),
  achievements: text('achievements'),
  avatarUrl: text('avatar_url'),
  hometown: varchar('hometown', { length: 300 }),
  birthplace: varchar('birthplace', { length: 300 }),
  residence: varchar('residence', { length: 300 }),
  burialPlace: varchar('burial_place', { length: 300 }),
  generation: integer('generation').notNull().default(1),
  branch: varchar('branch', { length: 100 }),
  isDeceased: boolean('is_deceased').default(false),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  socialLinks: jsonb('social_links'), // { facebook?, zalo?, tiktok?, youtube? }
  occupation: varchar('occupation', { length: 300 }),
  currentAddress: varchar('current_address', { length: 500 }),
  contactVisibility: jsonb('contact_visibility'), // { phone: bool, email: bool, social: bool }
  extra: jsonb('extra'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  fatherIdIdx: index('idx_persons_father_id').on(t.fatherId),
  motherIdIdx: index('idx_persons_mother_id').on(t.motherId),
}))

export const marriages = pgTable('marriages', {
  id: serial('id').primaryKey(),
  husbandId: integer('husband_id').notNull(),
  wifeId: integer('wife_id').notNull(),
  weddingYear: integer('wedding_year'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  husbandIdIdx: index('idx_marriages_husband_id').on(t.husbandId),
  wifeIdIdx: index('idx_marriages_wife_id').on(t.wifeId),
}))

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  authorId: integer('author_id').notNull(),
  isFeatured: boolean('is_featured').default(false),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const postComments = pgTable('post_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull(),
  userId: integer('user_id').notNull(),
  content: text('content').notNull(),
  parentId: integer('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  postIdIdx: index('idx_post_comments_post_id').on(t.postId),
}))

export const galleries = pgTable('galleries', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  images: jsonb('images').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const familyFund = pgTable('family_fund', {
  id: serial('id').primaryKey(),
  type: fundTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  description: text('description').notNull(),
  date: varchar('date', { length: 20 }).notNull(),
  recordedBy: integer('recorded_by').notNull(),
  personId: integer('person_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const memoryWall = pgTable('memory_wall', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull(),
  authorName: varchar('author_name', { length: 200 }).notNull(),
  authorUserId: integer('author_user_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  personIdIdx: index('idx_memory_wall_person_id').on(t.personId),
}))

export const editRequests = pgTable('edit_requests', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull(),
  requesterId: integer('requester_id').notNull(),
  changes: jsonb('changes').notNull(),
  status: editRequestStatusEnum('status').notNull().default('PENDING'),
  reviewedBy: integer('reviewed_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  personIdIdx: index('idx_edit_requests_person_id').on(t.personId),
}))

export interface NotificationStats {
  recipients: number
  email: { sent: number; failed: number; skipped: number }
  push: { sent: number; failed: number }
}

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  /** Shown on the public homepage (only once status = SENT) */
  isActive: boolean('is_active').default(true),
  /** MANUAL (admin-written) | ACCOUNT (new-account email) | TEST (legacy test push) */
  kind: varchar('kind', { length: 20 }).notNull().default('MANUAL'),
  /** ALL active members / devices, or only recipientUserIds */
  audience: varchar('audience', { length: 10 }).notNull().default('ALL'),
  recipientUserIds: jsonb('recipient_user_ids').$type<number[]>(),
  sendEmail: boolean('send_email').notNull().default(false),
  sendPush: boolean('send_push').notNull().default(false),
  url: varchar('url', { length: 500 }),
  /** DRAFT | SCHEDULED | SENDING | SENT | FAILED */
  status: varchar('status', { length: 20 }).notNull().default('SENT'),
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  stats: jsonb('stats').$type<NotificationStats>(),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  statusScheduledIdx: index('idx_notifications_status_scheduled').on(t.status, t.scheduledAt),
}))

/** One row per attempted email / push, so admins can see exactly who received what */
export const notificationDeliveries = pgTable('notification_deliveries', {
  id: serial('id').primaryKey(),
  notificationId: integer('notification_id').notNull(),
  userId: integer('user_id'),
  channel: varchar('channel', { length: 10 }).notNull(), // EMAIL | PUSH
  target: varchar('target', { length: 500 }), // email address or device description
  status: varchar('status', { length: 10 }).notNull(), // SENT | FAILED | SKIPPED
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  notificationIdx: index('idx_notification_deliveries_notification_id').on(t.notificationId),
}))

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 500 }).notNull(),
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  source: mediaSourceEnum('source').notNull().default('UPLOAD'),
  personId: integer('person_id'),
  postId: integer('post_id'),
  caption: text('caption'),
  uploadedBy: integer('uploaded_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  personIdIdx: index('idx_media_person_id').on(t.personId),
  postIdIdx: index('idx_media_post_id').on(t.postId),
}))

export const homeCarouselSlides = pgTable('home_carousel_slides', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  title: varchar('title', { length: 200 }),
  description: text('description'),
  order: integer('order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const anniversaryTypeEnum = pgEnum('anniversary_type', ['DEATH', 'COMMEMORATION', 'OTHER'])

export const anniversaries = pgTable('anniversaries', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 300 }).notNull(),
  type: anniversaryTypeEnum('type').notNull().default('OTHER'),
  dateType: varchar('date_type', { length: 10 }).notNull().default('SOLAR'), // 'SOLAR' or 'LUNAR'
  day: integer('day').notNull(),
  month: integer('month').notNull(),
  description: text('description'),
  personId: integer('person_id'),
  postId: integer('post_id'),
  isRecurring: boolean('is_recurring').notNull().default(true),
  year: integer('year'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  personIdIdx: index('idx_anniversaries_person_id').on(t.personId),
}))

export const systemFeedbacks = pgTable('system_feedbacks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  authorName: varchar('author_name', { length: 200 }).notNull(),
  content: text('content').notNull(),
  isResolved: boolean('is_resolved').default(false).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

