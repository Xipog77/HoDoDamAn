DROP TABLE IF EXISTS "anniversary_reminders_sent";
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "kind" varchar(20) DEFAULT 'MANUAL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "audience" varchar(10) DEFAULT 'ALL' NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_user_ids" jsonb;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "send_email" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "send_push" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "url" varchar(500);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'SENT' NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "scheduled_at" timestamp;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "stats" jsonb;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_by" integer;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "notifications" SET "sent_at" = "created_at" WHERE "sent_at" IS NULL AND "status" = 'SENT';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_status_scheduled" ON "notifications" ("status", "scheduled_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"user_id" integer,
	"channel" varchar(10) NOT NULL,
	"target" varchar(500),
	"status" varchar(10) NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notification_deliveries_notification_id" ON "notification_deliveries" ("notification_id");
