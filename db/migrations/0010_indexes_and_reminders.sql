CREATE INDEX IF NOT EXISTS "idx_persons_father_id" ON "persons" ("father_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_persons_mother_id" ON "persons" ("mother_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marriages_husband_id" ON "marriages" ("husband_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_marriages_wife_id" ON "marriages" ("wife_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_post_comments_post_id" ON "post_comments" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_memory_wall_person_id" ON "memory_wall" ("person_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_requests_person_id" ON "edit_requests" ("person_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_person_id" ON "media" ("person_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_media_post_id" ON "media" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_anniversaries_person_id" ON "anniversaries" ("person_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anniversary_reminders_sent" (
	"anniversary_id" integer NOT NULL,
	"occurs_on" date NOT NULL,
	"days_before" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	PRIMARY KEY ("anniversary_id", "occurs_on", "days_before")
);
