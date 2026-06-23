CREATE TABLE IF NOT EXISTS "home_carousel_slides" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"title" varchar(200),
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_fund" ADD COLUMN "person_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications" boolean DEFAULT true NOT NULL;