ALTER TABLE "anniversaries" ADD COLUMN "is_recurring" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "anniversaries" ADD COLUMN "year" integer;