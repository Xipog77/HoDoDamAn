ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "anniversary_id" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_anniversary_id" ON "notifications" ("anniversary_id");
