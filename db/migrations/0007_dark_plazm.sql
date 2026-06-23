ALTER TABLE "persons" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "occupation" varchar(300);--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "current_address" varchar(500);--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "contact_visibility" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "occupation" varchar(300);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_address" varchar(500);